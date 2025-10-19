class WebRTCService extends EventTarget {
  constructor(turnServerConfig = null) {
    super();
    
    // Default coturn TURN server configuration
    const defaultTurnConfig = {
      host: '31.97.188.80',
      port: 3478,
      username: 'coturn_user',
      credential: 'test123'
    };

    // Initialize with empty config - will be configured with TURN server only
    this.rtcConfig = {
      iceServers: [],
      iceCandidatePoolSize: 10
    };

    // Configure with provided config or default coturn server
    const turnConfig = turnServerConfig || defaultTurnConfig;
    this.configureTurnServer(turnConfig);

    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.isInCall = false;
    this.isCaller = false;
    this.callId = null;
    this.remoteUserId = null;
    this.socket = null;
    this.userId = null; // Store user ID for proper routing
    this.isAudioEnabled = true;
    this.isVideoEnabled = true;
    this.connectionRetries = 0;
    this.maxRetries = 1;
    this.isEnding = false;
    this.isScreenSharing = false;
    this.screenStream = null;
    this.cameraStream = null;
    this.videoSender = null;
    this.audioSender = null;
    this.screenShareEndHandler = null;
    this.adminPeerConnection = null;
    this.failureTimeoutId = null;
    this.pendingIceCandidates = [];
    this.hasRemoteDescription = false;
    this.recoveringVideoTrack = false;
    
    // Call duration tracking
    this.callStartTime = null;
    this.apiClient = null; // Will be set externally
  }

  configureTurnServer(config) {
    if (!config) {
      console.warn('⚠️ Student: No TURN config provided, keeping existing configuration');
      return;
    }

    const normalized = this.normalizeTurnConfig(config);
    const { urls, host, port, username, credential } = normalized;

    if (!urls.length) {
      console.warn('⚠️ Student: TURN config missing URLs, keeping existing configuration');
      return;
    }

    this.rtcConfig = {
      iceServers: [
        {
          urls,
          username,
          credential
        }
      ],
      iceCandidatePoolSize: 10,
      iceTransportPolicy: 'relay', // Force all connections through TURN server
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
      sdpSemantics: 'unified-plan',
      // Optimize for stable connections
      iceConnectionReceiveTimeout: 30000,
      iceInactiveTimeout: 30000,
      continualGatheringPolicy: 'gather_continually'
    };

    console.log('✅ Student: TURN server configured:', {
      host,
      port,
      username,
      urls,
      iceTransportPolicy: this.rtcConfig.iceTransportPolicy,
      mode: 'TURN relay only (no direct P2P or STUN)'
    });
  }

  normalizeTurnConfig(config) {
    const port = config.port || 3478;
    let urls = [];

    if (Array.isArray(config.urls) && config.urls.length > 0) {
      urls = config.urls;
    } else if (typeof config.urls === 'string') {
      urls = [config.urls];
    }

    if (urls.length === 0 && config.host) {
      urls = [
        `turn:${config.host}:${port}`,
        `turn:${config.host}:${port}?transport=tcp`
      ];
    }

    return {
      host: config.host || null,
      port,
      username: config.username,
      credential: config.credential,
      urls
    };
  }

  initialize(socket, userId = null) {
    this.socket = socket;
    this.userId = userId || socket.userData?.userId;
    this.setupSocketListeners();
  }

  setApiClient(apiClient) {
    this.apiClient = apiClient;
  }

  async trackCallDuration() {
    if (!this.callStartTime || !this.apiClient || !this.remoteUserId) {
      return;
    }

    try {
      const callEndTime = new Date();
      const duration = Math.floor((callEndTime - this.callStartTime) / 1000); // in seconds
      
      if (duration >= 5) { // Only track calls longer than 5 seconds
        
        await this.apiClient.trackCallSession(
          duration,
          this.callStartTime,
          callEndTime,
          this.remoteUserId,
          this.remoteUserName || 'Unknown',
          'teacher' // Since students call teachers
        );
        
      }
    } catch (error) {
      console.error('❌ Failed to track call duration:', error);
    }
  }

  setupSocketListeners() {
    if (!this.socket) {
      console.error('❌ Student WebRTC: No socket available for listeners');
      return;
    }

    this.socket.on('webrtc-offer', async (data) => {
      // If connection failed or disconnected, allow retries with new callId
      const connectionFailed = this.peerConnection && 
        (this.peerConnection.connectionState === 'failed' || 
         this.peerConnection.connectionState === 'disconnected' ||
         this.peerConnection.iceConnectionState === 'failed' ||
         this.peerConnection.iceConnectionState === 'disconnected');
      
      // Check if we're already in a call (but allow retries if connection failed)
      if (this.isInCall && this.callId !== data.callId && !connectionFailed) {
        console.warn('🚫 Student(mobile): Rejecting additional offer while already in call', {
          currentCallId: this.callId,
          newCallId: data.callId,
          callerId: data.callerId,
          connectionState: this.peerConnection?.connectionState,
          iceState: this.peerConnection?.iceConnectionState
        });
        this.socket.emit('webrtc-call-rejected', {
          callId: data.callId,
          recipientId: data.callerId,
          reason: 'already-in-call'
        });
        return;
      }
      
      // If connection failed, clean up and accept new call
      if (connectionFailed) {
        this.cleanup(); // Clean up failed connection
      }
      
      // If it's an ICE restart with same callId, handle it differently
      if (data.iceRestart && this.callId === data.callId) {
        await this.handleIceRestartOffer(data);
        return;
      }
      
      this.dispatchEvent(new CustomEvent('incoming-call', { detail: data }));
    });

    this.socket.on('webrtc-answer', async (data) => {
      await this.handleAnswer(data);
    });

    this.socket.on('webrtc-ice-candidate', async (data) => {
      await this.handleIceCandidate(data);
    });

    this.socket.on('webrtc-call-end', (data) => {
      console.warn('📴 Student: Received webrtc-call-end from remote', data);
      this.endCall(false);
    });

    this.socket.on('webrtc-call-rejected', (data) => {
      console.warn('❌ Student: Call rejected by remote', data);
      this.dispatchEvent(new CustomEvent('call-rejected', { detail: data }));
      this.cleanup();
    });

    this.socket.on('incoming-call-cancelled', (data = {}) => {
      console.warn('🔕 Student(mobile): Incoming call cancelled on another device', data);
      this.dispatchEvent(new CustomEvent('incoming-call-cancelled', { detail: data }));
    });

    this.socket.on('admin-webrtc-offer', async (data) => {
      await this.handleAdminOffer(data);
    });

    this.socket.on('admin-ice-candidate', async (data) => {
      if (this.adminPeerConnection && data.candidate) {
        try {
          await this.adminPeerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (error) {
          console.error('❌ Student: Failed to add admin ICE candidate:', error);
        }
      }
    });
  }

  async startCall(remoteUserId, remoteUserName) {
    try {
      
      this.remoteUserId = remoteUserId;
      this.remoteUserName = remoteUserName; // Store for call tracking
      this.isCaller = true;
      this.callId = `call_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      this.callStartTime = new Date(); // Track call start time

      await this.getUserMedia({ refresh: true });
      this.createPeerConnection();

      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream);
      });

      this.updateSenderReferences();

      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });

      await this.peerConnection.setLocalDescription(offer);
      
      // Wait for ICE gathering to complete before sending offer
      await this.waitForICEGathering();

      this.socket.emit('webrtc-offer', {
        callId: this.callId,
        recipientId: remoteUserId,
        callerId: this.userId || this.socket.userData?.userId,
        callerName: remoteUserName,
        offer: this.peerConnection.localDescription
      });

      this.isInCall = true;
      this.dispatchEvent(new CustomEvent('call-started', { 
        detail: { 
          callId: this.callId, 
          remoteUserId,
          localStream: this.localStream 
        } 
      }));

      return { success: true, callId: this.callId };

    } catch (error) {
      console.error('❌ Failed to start call:', error);
      this.cleanup();
      throw error;
    }
  }

  async answerCall(callData) {
    try {
      
      this.callId = callData.callId;
      this.remoteUserId = callData.callerId;
      this.isCaller = false;

      await this.getUserMedia({ refresh: true });
      this.createPeerConnection();

      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream);
      });

      this.updateSenderReferences();

      await this.peerConnection.setRemoteDescription(callData.offer);
      this.hasRemoteDescription = true;
      
      // Process any queued ICE candidates after setting remote description
      if (this.pendingIceCandidates.length > 0) {
        for (const candidate of this.pendingIceCandidates) {
          try {
            await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (error) {
            console.error('❌ Student: Failed to add queued ICE candidate:', error);
          }
        }
        this.pendingIceCandidates = [];
      }

      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      
      // Wait for ICE gathering to complete before sending answer
      await this.waitForICEGathering();

      this.socket.emit('webrtc-answer', {
        callId: this.callId,
        recipientId: callData.callerId,
        answer: this.peerConnection.localDescription
      });

      this.isInCall = true;
      this.dispatchEvent(new CustomEvent('call-answered', { 
        detail: { 
          callId: this.callId, 
          localStream: this.localStream 
        } 
      }));

      return { success: true };

    } catch (error) {
      console.error('❌ Failed to answer call:', error);
      this.rejectCall(callData.callId, callData.callerId);
      throw error;
    }
  }

  rejectCall(callId, callerId, reason = 'user-rejected') {
    console.warn('🚫 Student(mobile): Rejecting call', { callId, callerId, reason });
    this.socket.emit('webrtc-call-rejected', {
      callId: callId,
      recipientId: callerId,
      reason
    });
    this.cleanup();
  }

  endCall(sendSignal = true) {
    // Prevent multiple calls to endCall
    if (this.isEnding) {
      console.warn('⚠️ Student: endCall invoked while already ending');
      return;
    }
    this.isEnding = true;

    console.warn('⚠️ Student: endCall invoked', {
      sendSignal,
      callId: this.callId,
      remoteUserId: this.remoteUserId,
      connectionState: this.peerConnection?.connectionState,
      iceState: this.peerConnection?.iceConnectionState
    });

    
    // Track call duration before cleanup
    this.trackCallDuration();

    if (sendSignal && this.callId && this.remoteUserId) {
      this.socket.emit('webrtc-call-end', {
        callId: this.callId,
        recipientId: this.remoteUserId
      });
    }
    
    this.dispatchEvent(new CustomEvent('call-ended', { detail: { sendSignal } }));
    this.cleanup();
    
    // Reset the ending flag after cleanup
    setTimeout(() => {
      this.isEnding = false;
    }, 100);
  }

  async getUserMedia({ refresh = false } = {}) {
    try {
      // Reuse existing camera stream when possible to avoid renegotiation glitches
      if (!refresh && this.cameraStream && this.cameraStream.getVideoTracks().length) {
        this.localStream = this.cameraStream;
        this.isVideoEnabled = this.cameraStream.getVideoTracks()[0]?.enabled !== false;
        this.isAudioEnabled = this.cameraStream.getAudioTracks()[0]?.enabled !== false;
        this.attachLocalTrackListeners(this.cameraStream);
        return this.cameraStream;
      }

      // Enhanced browser support detection
      if (!navigator.mediaDevices) {
        throw new Error('MediaDevices API not available. This browser does not support WebRTC.');
      }
      
      if (!navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia is not available. Please use a modern browser like Chrome, Firefox, or Safari.');
      }

      if (refresh && this.cameraStream) {
        try {
          this.cameraStream.getTracks().forEach(track => track.stop());
        } catch (stopError) {
          console.warn('⚠️ Student: Failed to stop previous camera stream during refresh:', stopError);
        }
        this.cameraStream = null;
      }

      const constraints = {
        video: { 
          width: { ideal: 1280 }, 
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: { 
          echoCancellation: true, 
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1,
          volume: 1.0,
          latency: 0,
          googEchoCancellation: true,
          googExperimentalEchoCancellation: true,
          googAutoGainControl: true,
          googExperimentalAutoGainControl: true,
          googNoiseSuppression: true,
          googExperimentalNoiseSuppression: true,
          googBeamforming: true,
          googArrayGeometry: true,
          googAudioMirroring: false,
          mozEchoCancellation: true,
          mozNoiseSuppression: true,
          mozAutoGainControl: true
        }
      };
      
      const freshStream = await navigator.mediaDevices.getUserMedia(constraints);

      this.cameraStream = freshStream;
      this.localStream = freshStream;
      this.isVideoEnabled = freshStream.getVideoTracks()[0]?.enabled !== false;
      this.isAudioEnabled = freshStream.getAudioTracks()[0]?.enabled !== false;
      this.attachLocalTrackListeners(freshStream);
      
      return freshStream;
      
    } catch (error) {
      console.error('❌ Student: Failed to get user media:', error);
      console.error('❌ Student: Error name:', error.name);
      console.error('❌ Student: Error message:', error.message);
      
      if (error.name === 'NotAllowedError') {
        throw new Error('Camera and microphone access denied. Please allow access and try again.');
      } else if (error.name === 'NotFoundError') {
        throw new Error('No camera or microphone found. Please check your devices.');
      } else if (error.name === 'NotReadableError') {
        throw new Error('Camera or microphone is already in use by another application.');
      } else if (error.name === 'OverconstrainedError') {
        throw new Error('Camera constraints cannot be satisfied. Try with different settings.');
      } else {
        throw new Error(`Media access failed: ${error.message}`);
      }
    }
  }

  createPeerConnection() {
    this.peerConnection = new RTCPeerConnection(this.rtcConfig);

    this.peerConnection.ontrack = (event) => {
      this.remoteStream = event.streams[0];
      this.dispatchEvent(new CustomEvent('remote-stream', { 
        detail: { stream: this.remoteStream } 
      }));
    };

    this.peerConnection.onnegotiationneeded = () => {
      this.updateSenderReferences();
    };

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('webrtc-ice-candidate', {
          callId: this.callId,
          recipientId: this.remoteUserId,
          candidate: event.candidate
        });
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection.connectionState;
      
      if (state === 'connected') {
        this.clearFailureTimeout(); // Clear any pending failure handlers
        this.dispatchEvent(new CustomEvent('connection-established'));
      } else if (state === 'failed') {
        console.error('❌ Student: WebRTC connection failed');
        // Add delay before handling failure to allow natural recovery
        this.scheduleFailureHandler();
      } else if (state === 'disconnected') {
        // WebRTC connections often go through disconnected states temporarily
        // Only act if it stays disconnected for a long time
        setTimeout(() => {
          if (this.peerConnection && this.peerConnection.connectionState === 'disconnected') {
            // Don't fail the call - many connections recover from this state
            // this.dispatchEvent(new CustomEvent('connection-failed', { 
            //   detail: { reason: 'Connection timeout' } 
            // }));
          }
        }, 15000);
      }
    };
    
    this.peerConnection.oniceconnectionstatechange = () => {
      const state = this.peerConnection.iceConnectionState;
      
      if (state === 'connected' || state === 'completed') {
        this.dispatchEvent(new CustomEvent('call-connected'));
      } else if (state === 'failed') {
        console.error('❌ Student: ICE connection failed - TURN server may not be working');
        try {
          if (this.peerConnection && typeof this.peerConnection.restartIce === 'function') {
            this.peerConnection.restartIce().catch(() => {});
          }
        } catch (error) {
          console.warn('⚠️ Student: ICE restart attempt after failure did not succeed:', error);
        }
      } else if (state === 'disconnected') {
        // ICE disconnected is very common and usually recovers automatically
        // Only fail after a much longer timeout and multiple checks
        let checkCount = 0;
        const checkInterval = setInterval(() => {
          checkCount++;
          if (!this.peerConnection) {
            clearInterval(checkInterval);
            return;
          }
          
          const currentState = this.peerConnection.iceConnectionState;
          
          if (currentState === 'connected' || currentState === 'completed') {
            clearInterval(checkInterval);
          } else if (checkCount >= 5) {
            clearInterval(checkInterval);
            try {
              if (this.peerConnection && typeof this.peerConnection.restartIce === 'function') {
                this.peerConnection.restartIce().catch(() => {});
              }
            } catch (error) {
              console.warn('⚠️ Student: ICE restart attempt after prolonged disconnect failed:', error);
            }
          }
        }, 5000);
      }
    };
    
    this.peerConnection.onicegatheringstatechange = () => {
    };
  }

  updateSenderReferences() {
    if (!this.peerConnection) {
      this.videoSender = null;
      this.audioSender = null;
      return;
    }

    const senders = this.peerConnection.getSenders();
    this.videoSender = senders.find(sender => sender.track && sender.track.kind === 'video') || null;
    this.audioSender = senders.find(sender => sender.track && sender.track.kind === 'audio') || null;
  }

  getVideoSender() {
    if (this.videoSender && this.videoSender.track) {
      return this.videoSender;
    }
    this.updateSenderReferences();
    return this.videoSender;
  }

  getAudioSender() {
    if (this.audioSender && this.audioSender.track) {
      return this.audioSender;
    }
    this.updateSenderReferences();
    return this.audioSender;
  }

  async handleAnswer(data) {
    if (this.peerConnection && data.answer) {
      await this.peerConnection.setRemoteDescription(data.answer);
      this.hasRemoteDescription = true;
      
      // Process any queued ICE candidates
      if (this.pendingIceCandidates.length > 0) {
        for (const candidate of this.pendingIceCandidates) {
          try {
            await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (error) {
            console.error('❌ Student: Failed to add queued ICE candidate:', error);
          }
        }
        this.pendingIceCandidates = [];
      }
      
      this.dispatchEvent(new CustomEvent('call-connected'));
    }
  }

  async handleIceRestartOffer(data) {
    try {
      if (this.peerConnection && data.offer) {
        await this.peerConnection.setRemoteDescription(data.offer);
        
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);
        
        this.socket.emit('webrtc-answer', {
          callId: this.callId,
          recipientId: data.callerId,
          answer: answer
        });
        
      }
    } catch (error) {
      console.error('❌ Student: Failed to handle ICE restart:', error);
    }
  }

  async handleIceCandidate(data) {
    if (this.peerConnection && data.candidate) {
      // If remote description is not set, queue the candidate
      if (!this.hasRemoteDescription) {
        this.pendingIceCandidates.push(data.candidate);
        return;
      }
      
      try {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch (error) {
        console.error('❌ Student: Failed to add ICE candidate:', error);
        console.error('❌ Student: Problematic candidate:', data.candidate);
      }
    }
  }

  async toggleVideo() {
    try {
      if (this.isScreenSharing) {
        await this.stopScreenShare();
      }

      const stream = await this.getUserMedia({ refresh: !this.cameraStream });
      this.cameraStream = stream || this.cameraStream;
      this.attachLocalTrackListeners(this.cameraStream);
      const videoTrack = this.cameraStream?.getVideoTracks()?.[0];
      if (!videoTrack) {
        console.warn('⚠️ Student: No video track available to toggle');
        return false;
      }

      videoTrack.enabled = !videoTrack.enabled;
      this.isVideoEnabled = videoTrack.enabled;

      const sender = this.getVideoSender();
      if (sender && videoTrack) {
        await sender.replaceTrack(videoTrack);
      }

      this.localStream = this.cameraStream;
      return this.isVideoEnabled;
    } catch (error) {
      console.error('❌ Student: Failed to toggle video:', error);
      return false;
    }
  }

  toggleAudio() {
    const source = this.cameraStream || this.localStream;
    if (source) {
      const audioTrack = source.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        this.isAudioEnabled = audioTrack.enabled;
        this.localStream = source;
        return this.isAudioEnabled;
      }
    }
    return false;
  }

  attachLocalTrackListeners(stream) {
    if (!stream) {
      return;
    }

    stream.getTracks().forEach(track => {
      if (track.kind === 'video') {
        track.onended = () => {
          console.warn('⚠️ Student: Local video track ended unexpectedly');
          this.recoverVideoTrack('track-ended');
        };

        track.onmute = () => {
          if (!this.isScreenSharing && this.getVideoSender()?.track === track) {
            setTimeout(() => {
              if (track.muted && !this.isScreenSharing && this.getVideoSender()?.track === track) {
                console.warn('⚠️ Student: Local video track muted for extended period, attempting recovery');
                this.recoverVideoTrack('track-muted');
              }
            }, 3000);
          }
        };
      }
    });
  }

  async recoverVideoTrack(reason) {
    if (this.isScreenSharing) {
      console.warn('⚠️ Student: Skipping video recovery during screen share', { reason });
      return;
    }

    if (!this.isVideoEnabled) {
      console.warn('⚠️ Student: Video disabled by user, skipping recovery', { reason });
      return;
    }

    if (this.recoveringVideoTrack) {
      console.warn('⚠️ Student: Video recovery already in progress, skipping', { reason });
      return;
    }

    this.recoveringVideoTrack = true;
    console.warn('🔧 Student: Attempting to recover video track', { reason });

    try {
      const refreshedStream = await this.getUserMedia({ refresh: true });
      if (!refreshedStream) {
        console.warn('⚠️ Student: getUserMedia returned no stream during recovery');
        return;
      }

      this.attachLocalTrackListeners(refreshedStream);

      const newTrack = refreshedStream.getVideoTracks()?.[0];
      const sender = this.getVideoSender();

      if (sender && newTrack) {
        newTrack.enabled = this.isVideoEnabled;
        await sender.replaceTrack(newTrack);
        this.localStream = refreshedStream;
        console.log('✅ Student: Video track recovered successfully', { reason });
      } else {
        console.warn('⚠️ Student: Unable to recover video track - missing sender or track', {
          hasSender: !!sender,
          hasTrack: !!newTrack,
          reason
        });
      }
    } catch (error) {
      console.error('❌ Student: Failed to recover video track:', error);
    } finally {
      this.recoveringVideoTrack = false;
    }
  }

  async startScreenShare() {
    try {
      
      // Check secure context requirement
      if (!window.isSecureContext) {
        throw new Error('Screen sharing requires HTTPS or localhost');
      }
      
      // Check API availability
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        throw new Error('Screen sharing not supported in this browser. Please use Chrome 72+, Firefox 66+, or Safari 13+');
      }

      
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920, max: 1920 },
          height: { ideal: 1080, max: 1080 },
          frameRate: { ideal: 15, max: 30 }
        },
        audio: false
      });

      if (!this.peerConnection) {
        throw new Error('No active call to share screen');
      }

      this.cameraStream = this.cameraStream || this.localStream || await this.getUserMedia({ refresh: false });

      const videoSender = this.getVideoSender();

      if (videoSender) {
        const screenTrack = screenStream.getVideoTracks()[0];
        await videoSender.replaceTrack(screenTrack);
        
        this.isScreenSharing = true;
        this.screenStream = screenStream;
        
        if (this.screenShareEndHandler) {
          screenTrack.removeEventListener('ended', this.screenShareEndHandler);
          screenTrack.removeEventListener('inactive', this.screenShareEndHandler);
        }

        this.screenShareEndHandler = () => {
          this.stopScreenShare().catch((stopError) => {
            console.error('❌ Student: Screen share auto-stop failed:', stopError);
          });
        };

        screenTrack.addEventListener('ended', this.screenShareEndHandler);
        screenTrack.addEventListener('inactive', this.screenShareEndHandler);

        this.socket.emit('webrtc-screen-share', {
          callId: this.callId,
          recipientId: this.remoteUserId,
          isSharing: true
        });

        this.dispatchEvent(new CustomEvent('screen-share-started'));
        return true;
      }
      
      throw new Error('No video sender found');
    } catch (error) {
      console.error('❌ Student: Screen share failed:', error);
      throw error;
    }
  }

  async stopScreenShare() {
    try {
      if (!this.isScreenSharing) return;
      this.isScreenSharing = false;

      if (this.screenStream) {
        try {
          const track = this.screenStream.getVideoTracks()[0];
          if (track && this.screenShareEndHandler) {
            track.removeEventListener('ended', this.screenShareEndHandler);
            track.removeEventListener('inactive', this.screenShareEndHandler);
          }
          this.screenStream.getTracks().forEach(track => track.stop());
        } catch (stopError) {
          console.warn('⚠️ Student: Error stopping screen share stream:', stopError);
        }
        this.screenStream = null;
        this.screenShareEndHandler = null;
      }

      const cameraStream = await this.getUserMedia({ refresh: !this.cameraStream });
      this.cameraStream = cameraStream || this.cameraStream;
      this.attachLocalTrackListeners(this.cameraStream);
      const cameraTrack = this.cameraStream?.getVideoTracks()?.[0];
      const videoSender = this.getVideoSender();

      if (videoSender && cameraTrack) {
        await videoSender.replaceTrack(cameraTrack);
        cameraTrack.enabled = this.isVideoEnabled;
      }

      this.localStream = this.cameraStream || this.localStream;

      this.socket.emit('webrtc-screen-share', {
        callId: this.callId,
        recipientId: this.remoteUserId,
        isSharing: false
      });

      this.dispatchEvent(new CustomEvent('screen-share-stopped'));
    } catch (error) {
      console.error('❌ Student: Failed to stop screen share:', error);
      throw error;
    }
  }

  getStatus() {
    return {
      isInCall: this.isInCall,
      isCaller: this.isCaller,
      callId: this.callId,
      remoteUserId: this.remoteUserId,
      hasLocalStream: !!this.localStream,
      hasRemoteStream: !!this.remoteStream,
      isAudioEnabled: this.isAudioEnabled,
      isVideoEnabled: this.isVideoEnabled,
      isScreenSharing: this.isScreenSharing,
      connectionState: this.peerConnection?.connectionState
    };
  }

  scheduleFailureHandler() {
    // Clear any existing timeout
    this.clearFailureTimeout();
    
    // Wait 10 seconds before handling failure to allow natural recovery
    this.failureTimeoutId = setTimeout(() => {
      // Double-check if we're still in failed state
      if (this.peerConnection && this.peerConnection.connectionState === 'failed') {
        console.warn('⚠️ Student: WebRTC still reporting failed state; keeping call alive for manual recovery');
        try {
          if (typeof this.peerConnection.restartIce === 'function') {
            this.peerConnection.restartIce().catch(() => {});
          }
        } catch (restartError) {
          console.warn('⚠️ Student: ICE restart attempt failed:', restartError);
        }
      } else {
      }
    }, 10000);
  }

  clearFailureTimeout() {
    if (this.failureTimeoutId) {
      clearTimeout(this.failureTimeoutId);
      this.failureTimeoutId = null;
    }
  }

  waitForICEGathering(timeout = 5000) {
    return new Promise((resolve) => {
      if (!this.peerConnection || this.peerConnection.iceGatheringState === 'complete') {
        resolve();
        return;
      }

      const timeoutId = setTimeout(() => {
        resolve();
      }, timeout);

      const handleStateChange = () => {
        if (this.peerConnection.iceGatheringState === 'complete') {
          clearTimeout(timeoutId);
          this.peerConnection.removeEventListener('icegatheringstatechange', handleStateChange);
          resolve();
        }
      };

      this.peerConnection.addEventListener('icegatheringstatechange', handleStateChange);
    });
  }

  cleanup() {
    console.warn('🧹 Student: cleanup invoked', {
      hadPeerConnection: !!this.peerConnection,
      hadLocalStream: !!this.localStream,
      hadScreenStream: !!this.screenStream,
      hadAdminConnection: !!this.adminPeerConnection
    });

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    if (this.cameraStream && this.cameraStream !== this.localStream) {
      try {
        this.cameraStream.getTracks().forEach(track => track.stop());
      } catch (error) {
        console.warn('⚠️ Student: Failed to stop camera stream during cleanup:', error);
      }
      this.cameraStream = null;
    }

    if (this.screenStream) {
      this.screenStream.getTracks().forEach(track => track.stop());
      this.screenStream = null;
    }

    this.screenShareEndHandler = null;

    if (this.adminPeerConnection) {
      try {
        this.adminPeerConnection.close();
      } catch (error) {
        console.warn('⚠️ Student: Failed to close admin peer connection:', error);
      }
      this.adminPeerConnection = null;
    }


    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    this.isInCall = false;
    this.isCaller = false;
    this.callId = null;
    this.remoteUserId = null;
    this.remoteStream = null;
    this.isAudioEnabled = true;
    this.isVideoEnabled = true;
    this.clearFailureTimeout();
    this.isEnding = false;
    this.isScreenSharing = false;
    this.videoSender = null;
    this.audioSender = null;
    this.pendingIceCandidates = [];
    this.hasRemoteDescription = false;
    this.recoveringVideoTrack = false;
  }

  destroy() {
    this.cleanup();
    
    if (this.socket) {
      this.socket.off('webrtc-offer');
      this.socket.off('webrtc-answer');
      this.socket.off('webrtc-ice-candidate');
      this.socket.off('webrtc-call-end');
      this.socket.off('webrtc-call-rejected');
      this.socket.off('admin-webrtc-offer');
      this.socket.off('admin-ice-candidate');
    }
  }

  async handleAdminOffer(data) {
    try {
      if (!this.localStream) {
        await this.getUserMedia({ refresh: !this.cameraStream });
      }

      this.adminPeerConnection = new RTCPeerConnection(this.rtcConfig);

      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          this.adminPeerConnection.addTrack(track, this.localStream);
        });
      }

      this.adminPeerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          this.socket.emit('admin-ice-candidate', {
            targetId: data.adminId,
            adminId: data.adminId,
            sourceId: this.socket?.id || this.userId,
            callId: data.callId,
            candidate: event.candidate
          });
        }
      };

      await this.adminPeerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));

      const answer = await this.adminPeerConnection.createAnswer();
      await this.adminPeerConnection.setLocalDescription(answer);

      this.socket.emit('admin-webrtc-answer', {
        targetId: data.adminId,
        adminId: data.adminId,
        sourceId: this.socket?.id || this.userId,
        callId: data.callId,
        answer: answer
      });
    } catch (error) {
      console.error('❌ Student: Failed to handle admin offer:', error);
    }
  }
}

export default WebRTCService;
