import React, { useState, useRef, useEffect } from 'react';
import WhiteboardCanvas from './WhiteboardCanvas';
import { auth } from '../config/firebase';
import {
  Box,
  IconButton,
  Typography,
  Paper,
  Chip,
  alpha,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  TextField,
  Divider,
  Slide,
  Popover,
  Badge,
} from '@mui/material';
import {
  CallEnd as CallEndIcon,
  Mic as MicIcon,
  MicOff as MicOffIcon,
  Videocam as VideocamIcon,
  VideocamOff as VideocamOffIcon,
  VolumeUp as VolumeUpIcon,
  VolumeDown as VolumeDownIcon,
  ScreenShare as ScreenShareIcon,
  StopScreenShare as StopScreenShareIcon,
  Draw as WhiteboardIcon,
  PanTool as RaiseHandIcon,
  Chat as ChatIcon,
  Send as SendIcon,
  EmojiEmotions as EmojiIcon,
  Close as CloseIcon,
  Settings as SettingsIcon,
  Subtitles as SubtitlesIcon,
  SubtitlesOff as SubtitlesOffIcon,
  Person as PersonIcon,
  School as SchoolIcon,
} from '@mui/icons-material';

function VideoCallWindow({
  isOpen = false,
  callData,
  callStatus = 'connecting',
  onEndCall,
  webrtcService,
  socketManager,
  currentUser,
  sttLanguage = 'en-US'
}) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [remoteVolume, setRemoteVolume] = useState(0.7);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [raisedHands, setRaisedHands] = useState(new Map());
  const [showRaiseHandPopup, setShowRaiseHandPopup] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [emojiAnchorEl, setEmojiAnchorEl] = useState(null);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const chatContainerRef = useRef(null);
  
  
  // Simple transcription state
  const [micTranscript, setMicTranscript] = useState('');
  const [speakerTranscript, setSpeakerTranscript] = useState('');
  const [showTranscription, setShowTranscription] = useState(false);
  const [isTranscriptionActive, setIsTranscriptionActive] = useState(false);
  const [isTranscriptionEnabled, setIsTranscriptionEnabled] = useState(true);
  const [transcriptions, setTranscriptions] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [micAudioLevel, setMicAudioLevel] = useState(0);
  const [speakerAudioLevel, setSpeakerAudioLevel] = useState(0);
  // Get language from user settings or default to en-US
  const [selectedLanguage, setSelectedLanguage] = useState(sttLanguage || 'en-US');
  
  // Update local language when prop changes
  useEffect(() => {
    if (sttLanguage && sttLanguage !== selectedLanguage) {
      setSelectedLanguage(sttLanguage);
    }
  }, [sttLanguage, selectedLanguage]);
  
  // Supported languages for STT (using working language codes)
  const SUPPORTED_LANGUAGES = {
    'en-US': { name: 'English', flag: '🇺🇸' },
    'hi-IN': { name: 'Hindi/Urdu', flag: '🇮🇳' }, // Hindi works for Urdu - confirmed working
    'ar-SA': { name: 'Arabic', flag: '🇸🇦' } // ar-SA for Saudi Arabia Arabic (most standard)
  };
  
  const micRecorderRef = useRef(null);
  const speakerRecorderRef = useRef(null);
  const transcriptionRef = useRef(null);


  useEffect(() => {
    if (!webrtcService) return;

    const status = webrtcService.getStatus();
    if (status.hasLocalStream) {
      setLocalStream(webrtcService.localStream);
    }

    const handleRemoteStream = (event) => {
      setRemoteStream(event.detail.stream);
    };

    webrtcService.addEventListener('remote-stream', handleRemoteStream);
    
    return () => {
      webrtcService.removeEventListener('remote-stream', handleRemoteStream);
    };
  }, [webrtcService]);

  // Initialize connection status when component loads
  useEffect(() => {
    if (isTranscriptionEnabled) {
      setTimeout(() => {
        setConnectionStatus('connected');
      }, 1000);
    }
  }, []);



  // Auto-start STT when call is connected
  useEffect(() => {
    if (callStatus === 'connected' && (localStream || remoteStream)) {
      setShowTranscription(false);
      setIsTranscriptionEnabled(true);
      setIsTranscriptionActive(true);
      startSimpleTranscription();
    }
    
    return () => {
      stopSimpleTranscription();
    };
  }, [callStatus, localStream, remoteStream, callData]);

  // Simple transcription functions
  const startSimpleTranscription = () => {
    setConnectionStatus('connecting');
    setIsTranscriptionActive(true);
    
    if (localStream) {
      startMicTranscription();
    }
    if (remoteStream) {
      startSpeakerTranscription();
    }
    
    // Set connected status after a brief delay
    setTimeout(() => {
      setConnectionStatus('connected');
    }, 500);
  };

  const stopSimpleTranscription = () => {
    setConnectionStatus('disconnected');
    setIsTranscriptionActive(false);
    setMicAudioLevel(0);
    setSpeakerAudioLevel(0);
    
    // Cleanup mic AudioContext
    if (micRecorderRef.current) {
      try {
        const { audioContext, processor, source } = micRecorderRef.current;
        if (source && processor) {
          source.disconnect();
          processor.disconnect();
        }
        if (audioContext && audioContext.state !== 'closed') {
          audioContext.close();
        }
      } catch (error) {
        console.error('❌ Error cleaning up mic AudioContext:', error);
      }
      micRecorderRef.current = null;
    }
    
    // Cleanup speaker AudioContext
    if (speakerRecorderRef.current) {
      try {
        const { audioContext, processor, source } = speakerRecorderRef.current;
        if (source && processor) {
          source.disconnect();
          processor.disconnect();
        }
        if (audioContext && audioContext.state !== 'closed') {
          audioContext.close();
        }
      } catch (error) {
        console.error('❌ Error cleaning up speaker AudioContext:', error);
      }
      speakerRecorderRef.current = null;
    }
    
  };

  const startMicTranscription = () => {
    try {
      
      if (!localStream) {
        console.error('❌ No local stream available for mic transcription');
        return;
      }
      
      // Create AudioContext
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(localStream);
      
      // Create ScriptProcessorNode for audio processing
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      micRecorderRef.current = { audioContext, processor, source };
      
      let audioBuffer = [];
      let lastProcessTime = Date.now();
      let silenceStart = null;
      let isRecording = false;
      let speechStarted = false;
      
      // Audio activity detection thresholds
      const SPEECH_THRESHOLD = 0.01;  // Minimum level for speech
      const SILENCE_THRESHOLD = 0.005; // Maximum level for silence
      const MIN_SPEECH_DURATION = 1000; // Minimum 1 second of speech
      const MAX_CHUNK_DURATION = 8000;  // Maximum 8 seconds per chunk
      const SILENCE_TIMEOUT = Number.POSITIVE_INFINITY;     // Disable silence-based auto stop
      
      processor.onaudioprocess = async (event) => {
        const inputBuffer = event.inputBuffer;
        const inputData = inputBuffer.getChannelData(0);
        
        // Check for audio activity (RMS calculation)
        const audioLevel = Math.sqrt(inputData.reduce((sum, sample) => sum + sample * sample, 0) / inputData.length);
        
        // Update mic audio level state (scale to 0-100 for better visualization)
        setMicAudioLevel(Math.min(100, audioLevel * 1000));
        
        const now = Date.now();
        const isSpeech = audioLevel > SPEECH_THRESHOLD;
        const isSilence = audioLevel < SILENCE_THRESHOLD;
        
        // Voice Activity Detection logic
        if (isSpeech && !isRecording) {
          // Speech detected, start recording
          isRecording = true;
          speechStarted = true;
          silenceStart = null;
          lastProcessTime = now;
          audioBuffer = []; // Fresh start for new speech
        }
        
        if (isRecording) {
          // Convert Float32Array to Int16Array while recording
          const int16Array = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            int16Array[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
          }
          audioBuffer.push(...int16Array);
          
          // Track silence during recording
          if (isSilence) {
            if (!silenceStart) {
              silenceStart = now;
            }
          } else {
            silenceStart = null; // Reset silence timer on speech
          }
          
          // Decide when to process the audio chunk
          const recordingDuration = now - lastProcessTime;
          const silenceDuration = silenceStart ? now - silenceStart : 0;
          
          const shouldProcess = 
            (silenceDuration >= SILENCE_TIMEOUT && recordingDuration >= MIN_SPEECH_DURATION) || // End of sentence
            (recordingDuration >= MAX_CHUNK_DURATION); // Max chunk size reached
          
          if (shouldProcess && audioBuffer.length > 0) {
            const reasonMsg = silenceDuration >= SILENCE_TIMEOUT ? 'silence detected' : 'max duration reached';
            
            const int16Buffer = new Int16Array(audioBuffer);
            const audioData = Buffer.from(int16Buffer.buffer).toString('base64');
            
            // Reset for next chunk
            audioBuffer = [];
            lastProcessTime = now;
            isRecording = false;
            speechStarted = false;
            silenceStart = null;
          
            try {
            
            if (!window.electronAPI?.stt) {
              console.error('❌ electronAPI.stt not available');
              return;
            }
            
            const result = await window.electronAPI.stt.transcribeAudio(audioData, {
              participantType: 'teacher',
              languageCode: selectedLanguage,
              encoding: 'LINEAR16',
              sampleRateHertz: audioContext.sampleRate
            });
            
            if (result.success && result.transcript?.trim()) {
              const transcript = result.transcript.trim();
              
              setMicTranscript(transcript);
            } else {
            }
            } catch (sttError) {
              console.error('❌ STT processing error:', sttError);
            }
          }
        }
      };
      
      // Connect the nodes - ScriptProcessorNode needs to be connected to destination to work
      source.connect(processor);
      processor.connect(audioContext.destination); // Required for ScriptProcessorNode to fire events
      
      
      // Test if the processor is working after a short delay
    } catch (error) {
      console.error('❌ Mic transcription error:', error);
    }
  };

  const startSpeakerTranscription = () => {
    try {
      
      // Create AudioContext
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(remoteStream);
      
      // Create ScriptProcessorNode for audio processing
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      speakerRecorderRef.current = { audioContext, processor, source };
      
      let audioBuffer = [];
      let lastProcessTime = Date.now();
      let silenceStart = null;
      let isRecording = false;
      let speechStarted = false;
      
      // Audio activity detection thresholds
      const SPEECH_THRESHOLD = 0.01;  // Minimum level for speech
      const SILENCE_THRESHOLD = 0.005; // Maximum level for silence
      const MIN_SPEECH_DURATION = 1000; // Minimum 1 second of speech
      const MAX_CHUNK_DURATION = 8000;  // Maximum 8 seconds per chunk
      const SILENCE_TIMEOUT = Number.POSITIVE_INFINITY;     // Disable silence-based auto stop
      
      processor.onaudioprocess = async (event) => {
        const inputBuffer = event.inputBuffer;
        const inputData = inputBuffer.getChannelData(0);
        
        // Check for audio activity (RMS calculation)
        const audioLevel = Math.sqrt(inputData.reduce((sum, sample) => sum + sample * sample, 0) / inputData.length);
        
        // Update speaker audio level state (scale to 0-100 for better visualization)
        setSpeakerAudioLevel(Math.min(100, audioLevel * 1000));
        
        const now = Date.now();
        const isSpeech = audioLevel > SPEECH_THRESHOLD;
        const isSilence = audioLevel < SILENCE_THRESHOLD;
        
        // Voice Activity Detection logic
        if (isSpeech && !isRecording) {
          // Speech detected, start recording
          isRecording = true;
          speechStarted = true;
          silenceStart = null;
          lastProcessTime = now;
          audioBuffer = []; // Fresh start for new speech
        }
        
        if (isRecording) {
          // Convert Float32Array to Int16Array while recording
          const int16Array = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            int16Array[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
          }
          audioBuffer.push(...int16Array);
          
          // Track silence during recording
          if (isSilence) {
            if (!silenceStart) {
              silenceStart = now;
            }
          } else {
            silenceStart = null; // Reset silence timer on speech
          }
          
          // Decide when to process the audio chunk
          const recordingDuration = now - lastProcessTime;
          const silenceDuration = silenceStart ? now - silenceStart : 0;
          
          const shouldProcess = 
            (silenceDuration >= SILENCE_TIMEOUT && recordingDuration >= MIN_SPEECH_DURATION) || // End of sentence
            (recordingDuration >= MAX_CHUNK_DURATION); // Max chunk size reached
          
          if (shouldProcess && audioBuffer.length > 0) {
            const reasonMsg = silenceDuration >= SILENCE_TIMEOUT ? 'silence detected' : 'max duration reached';
            
            const int16Buffer = new Int16Array(audioBuffer);
            const audioData = Buffer.from(int16Buffer.buffer).toString('base64');
            
            // Reset for next chunk
            audioBuffer = [];
            lastProcessTime = now;
            isRecording = false;
            speechStarted = false;
            silenceStart = null;
          
            try {
            
            if (!window.electronAPI?.stt) {
              console.error('❌ electronAPI.stt not available for speaker');
              return;
            }
            
            const result = await window.electronAPI.stt.transcribeAudio(audioData, {
              participantType: 'student',
              languageCode: selectedLanguage,
              encoding: 'LINEAR16',
              sampleRateHertz: audioContext.sampleRate
            });
            
            if (result.success && result.transcript?.trim()) {
              const transcript = result.transcript.trim();
              
              setSpeakerTranscript(transcript);
            }
            } catch (sttError) {
              console.error('❌ STT processing error:', sttError);
            }
          }
        }
      };
      
      // Connect the nodes - ScriptProcessorNode needs to be connected to destination to work  
      source.connect(processor);
      processor.connect(audioContext.destination); // Required for ScriptProcessorNode to fire events
      
      
    } catch (error) {
      console.error('❌ Speaker transcription error:', error);
    }
  };

  // Simple toggle function
  const handleToggleTranscriptionDisplay = () => {
    setShowTranscription(!showTranscription);
  };

  // Initialize STT service
  const initializeDirectSTT = () => {
    setConnectionStatus('connecting');
    
    // Start transcription if we have streams
    if (callStatus === 'connected' && (localStream || remoteStream)) {
      startSimpleTranscription();
    } else {
      // Just set connected status if no streams yet
      setTimeout(() => {
        setConnectionStatus('connected');
        setIsTranscriptionActive(true);
      }, 1000);
    }
  };

  // Toggle transcription function
  const toggleTranscription = () => {
    const newState = !isTranscriptionEnabled;
    setIsTranscriptionEnabled(newState);
    setIsTranscriptionActive(newState);
  };

  // Cleanup transcription on unmount
  useEffect(() => {
    return () => {
      if (isTranscriptionActive) {
        stopSimpleTranscription();
      }
    };
  }, [isTranscriptionActive]);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      
      // Ensure local video plays
      localVideoRef.current.addEventListener('loadedmetadata', async () => {
        try {
          await localVideoRef.current.play();
        } catch (error) {
          console.warn('🎥 Student: Local video autoplay failed:', error);
        }
      });
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      // Set initial volume to prevent audio feedback/beeping
      remoteVideoRef.current.volume = remoteVolume;
      
      // Ensure proper audio playback settings
      remoteVideoRef.current.addEventListener('loadedmetadata', async () => {
        
        // Ensure video plays on mobile
        try {
          await remoteVideoRef.current.play();
        } catch (error) {
          console.warn('📢 Student: Remote video autoplay failed:', error);
          // This is expected on some mobile browsers - user interaction required
        }
      });
    } else {
      if (!remoteVideoRef.current) {
        console.warn('🎥 Student: Remote video ref not available');
      }
      if (!remoteStream) {
        console.warn('🎥 Student: Remote stream not available');
      }
    }
  }, [remoteStream, remoteVolume]);

  const handleToggleAudio = () => {
    if (webrtcService) {
      const enabled = webrtcService.toggleAudio();
      setIsAudioEnabled(enabled);
    }
  };

  const handleToggleVideo = async () => {
    if (!webrtcService) {
      return;
    }

    try {
      const enabled = await webrtcService.toggleVideo();
      setIsVideoEnabled(enabled);
      if (localVideoRef.current && webrtcService.localStream) {
        localVideoRef.current.srcObject = webrtcService.localStream;
      }
    } catch (error) {
      console.error('❌ Student: Failed to toggle video:', error);
    }
  };

  const handleVolumeUp = () => {
    const newVolume = Math.min(remoteVolume + 0.1, 1.0);
    setRemoteVolume(newVolume);
    if (remoteVideoRef.current) {
      remoteVideoRef.current.volume = newVolume;
    }
  };

  const handleVolumeDown = () => {
    const newVolume = Math.max(remoteVolume - 0.1, 0.0);
    setRemoteVolume(newVolume);
    if (remoteVideoRef.current) {
      remoteVideoRef.current.volume = newVolume;
    }
  };

  const handleToggleScreenShare = async () => {
    try {
      if (!webrtcService) {
        throw new Error('WebRTC service not available');
      }

      if (isScreenSharing) {
        await webrtcService.stopScreenShare();
        setIsScreenSharing(false);
      } else {
        await webrtcService.startScreenShare();
        setIsScreenSharing(true);
      }
    } catch (error) {
      console.error('❌ Teacher: Screen share toggle failed:', error);
      alert('Screen sharing failed: ' + error.message);
    }
  };

  // Listen for screen share events
  useEffect(() => {
    if (!webrtcService) return;

    const handleScreenShareStarted = () => setIsScreenSharing(true);
    const handleScreenShareStopped = () => setIsScreenSharing(false);

    webrtcService.addEventListener('screen-share-started', handleScreenShareStarted);
    webrtcService.addEventListener('screen-share-stopped', handleScreenShareStopped);

    return () => {
      webrtcService.removeEventListener('screen-share-started', handleScreenShareStarted);
      webrtcService.removeEventListener('screen-share-stopped', handleScreenShareStopped);
    };
  }, [webrtcService]);

  useEffect(() => {
    if (!socketManager?.socket) return;

    const handleStudentRaiseHand = (data) => {
      
      // Verify this is for our call
      if (data.callId !== callData?.callId) {
        return;
      }

      setRaisedHands(prev => {
        const newMap = new Map(prev);
        if (data.isRaised) {
          newMap.set(data.studentId, {
            name: data.studentName,
            timestamp: data.timestamp || Date.now()
          });
          // Show popup when student raises hand
          setShowRaiseHandPopup(true);
          
          // Optional: Show browser notification if supported
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Student Hand Raised', {
              body: `${data.studentName} wants to speak`,
              icon: '✋'
            });
          }
        } else {
          newMap.delete(data.studentId);
          // Hide popup if no hands are raised
          if (newMap.size === 0) {
            setShowRaiseHandPopup(false);
          }
        }
        return newMap;
      });
    };

    const handleChatMessage = (messageData) => {
      
      // Prevent duplicate messages (don't add if it's from ourselves)
      if (messageData.senderId === socketManager.socket.userData?.userId) {
        return;
      }
      
      setChatMessages(prev => {
        const newMessage = {
          id: Date.now() + Math.random(),
          message: messageData.message,
          sender: messageData.senderName || 'Student',
          senderId: messageData.senderId,
          timestamp: new Date(),
          isOwnMessage: false
        };
        return [...prev, newMessage];
      });

      // Increment unread count if chat is not visible
      if (!showChat) {
        setUnreadMessages(prev => prev + 1);
      }
    };

    socketManager.socket.on('student-raise-hand', handleStudentRaiseHand);
    socketManager.socket.on('call-chat-message', handleChatMessage);

    return () => {
      socketManager.socket.off('student-raise-hand', handleStudentRaiseHand);
      socketManager.socket.off('call-chat-message', handleChatMessage);
    };
  }, [socketManager]);

  const handleAcknowledgeHand = (studentId) => {
    setRaisedHands(prev => {
      const newMap = new Map(prev);
      newMap.delete(studentId);
      return newMap;
    });
    
    // Send acknowledgment to student
    if (socketManager?.socket) {
      socketManager.socket.emit('hand-acknowledged', {
        callId: callData?.callId || 'unknown',
        studentId: studentId
      });
    }
    
    // Hide popup if no hands remain
    if (raisedHands.size <= 1) {
      setShowRaiseHandPopup(false);
    }
  };

  const handleDismissPopup = () => {
    setShowRaiseHandPopup(false);
  };

  const handleToggleChat = () => {
    setShowChat(!showChat);
    if (!showChat) {
      // Reset unread count when opening chat
      setUnreadMessages(0);
    }
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) {
      return;
    }

    if (!socketManager) {
      console.error('❌ Teacher: socketManager is null/undefined');
      alert('Unable to send message: Socket manager not initialized. Please refresh the page.');
      return;
    }
    
    if (!socketManager.socket) {
      console.error('❌ Teacher: socketManager.socket is null/undefined');
      alert('Unable to send message: Socket not connected. Please check your connection.');
      return;
    }

    if (!socketManager.socket.connected) {
      console.error('❌ Teacher: Socket not connected');
      alert('Unable to send message: Not connected to server. Please try again.');
      return;
    }

    const messageData = {
      callId: callData?.callId || 'unknown',
      message: newMessage.trim(),
      senderId: socketManager.socket.userData?.userId || 'teacher',
      senderName: socketManager.socket.userData?.username || 'Teacher',
      timestamp: new Date().toISOString()
    };


    try {
      // Add message to local state first
      setChatMessages(prev => [...prev, {
        id: Date.now() + Math.random(),
        message: messageData.message,
        sender: 'You',
        senderId: messageData.senderId,
        timestamp: new Date(),
        isOwnMessage: true
      }]);

      // Send to other participants
      socketManager.socket.emit('call-chat-message', messageData, (acknowledgment) => {
        if (acknowledgment && acknowledgment.error) {
          console.error('❌ Teacher: Message send failed:', acknowledgment.error);
          alert('Failed to send message. Please try again.');
        } else {
        }
      });
      
      setNewMessage('');
    } catch (error) {
      console.error('❌ Teacher: Error sending message:', error);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Emoji functions
  const handleEmojiClick = (event) => {
    setEmojiAnchorEl(event.currentTarget);
  };

  const handleEmojiClose = () => {
    setEmojiAnchorEl(null);
  };

  const addEmoji = (emoji) => {
    setNewMessage(prev => prev + emoji);
    setEmojiAnchorEl(null);
  };

  const commonEmojis = [
    '😀', '😂', '🥰', '😍', '🤔', '👍', '👎', '❤️', '🎉', '🎊',
    '😊', '😎', '🙄', '😢', '😭', '😡', '🤗', '🤷', '🙏', '👏',
    '🔥', '⭐', '✅', '❌', '💯', '🎯', '📝', '💡', '🚀', '🎈'
  ];

  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Restart transcription when language changes
  useEffect(() => {
    if (isTranscriptionActive && selectedLanguage) {
      
      // Stop current transcription
      stopSimpleTranscription();
      
      // Restart with new language after brief delay
      setTimeout(() => {
        startSimpleTranscription();
      }, 500);
    }
  }, [selectedLanguage]);

  const handleToggleWhiteboard = () => {
    setShowWhiteboard(!showWhiteboard);
  };

  if (!isOpen) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: '#000',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Main Video Call Area */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
      >
      <Box
        sx={{
          position: 'absolute',
          top: 'max(20px, env(safe-area-inset-top))',
          left: 'max(20px, env(safe-area-inset-left))',
          zIndex: 10000,
        }}
      >
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            label={`Status: ${callStatus}`}
            color={callStatus === 'connected' ? 'success' : 'warning'}
            size="small"
          />
          {/* STT Active indicator hidden from teacher */}
          {false /* isTranscriptionActive */ && (
            <Chip
              label="📝 STT Active"
              color="success"
              size="small"
              sx={{ fontWeight: 500 }}
            />
          )}
          {raisedHands.size > 0 && (
            <Chip
              label={`✋ ${raisedHands.size} hand${raisedHands.size > 1 ? 's' : ''} raised`}
              color="warning"
              size="small"
              sx={{ backgroundColor: '#ff9800', color: 'white' }}
            />
          )}
        </Box>
      </Box>

      <Box
        sx={{
          flex: 1,
          position: 'relative',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          controls={false}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            backgroundColor: '#222',
          }}
        />

        {!remoteStream && (
          <Box
            sx={{
              position: 'absolute',
              color: 'white',
              textAlign: 'center',
            }}
          >
            <Typography variant="h6">
              {callStatus === 'connecting' ? 'Calling student...' : 'Waiting for video'}
            </Typography>
            <Typography variant="body2" color="grey.400">
              {callStatus === 'connecting' ? 'Waiting for student to answer' : 'Establishing connection'}
            </Typography>
          </Box>
        )}

        <Box
          sx={{
            position: 'absolute',
            top: 'max(20px, env(safe-area-inset-top))',
            right: 'max(20px, env(safe-area-inset-right))',
            width: {
              xs: 100,  // Smaller on mobile portrait
              sm: 120,  // Standard on larger screens
            },
            height: {
              xs: 140,  // Smaller on mobile portrait  
              sm: 160,  // Standard on larger screens
            },
            // Adjust size for landscape orientation on mobile
            '@media (max-height: 500px) and (orientation: landscape)': {
              width: 80,
              height: 100,
              top: '10px',
              right: '10px',
            },
            borderRadius: 3,
            overflow: 'hidden',
            border: 'none',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
          }}
        >
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
          
          {!isVideoEnabled && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: '#333',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <VideocamOffIcon sx={{ color: 'white', fontSize: 40 }} />
            </Box>
          )}
        </Box>
      </Box>

      {/* Mobile-optimized vertical button layout on left */}
      <Box
        sx={{
          position: 'absolute',
          left: 'max(12px, env(safe-area-inset-left))',
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex',
          flexDirection: 'column',
          gap: { xs: 1, sm: 1.5 },
          zIndex: 10000,
          padding: { xs: '6px', sm: '8px' },
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(10px)',
          borderRadius: '20px',
          border: '1px solid rgba(118, 166, 246, 0.2)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          // Landscape orientation adjustments
          '@media (max-height: 500px) and (orientation: landscape)': {
            padding: '4px',
            gap: 0.5,
            left: 'max(8px, env(safe-area-inset-left))',
          },
        }}
      >
        {/* Audio Toggle */}
        <IconButton
          onClick={handleToggleAudio}
          sx={{
            width: { xs: 48, sm: 56 },
            height: { xs: 48, sm: 56 },
            backgroundColor: isAudioEnabled 
              ? 'rgba(118, 166, 246, 0.15)' 
              : 'rgba(244, 67, 54, 0.9)',
            backdropFilter: 'blur(10px)',
            color: isAudioEnabled ? '#76a6f6' : 'white',
            border: `2px solid ${isAudioEnabled ? '#76a6f6' : '#f44336'}`,
            boxShadow: `0 4px 20px ${isAudioEnabled ? 'rgba(118, 166, 246, 0.25)' : 'rgba(244, 67, 54, 0.3)'}`,
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: 'scale(1.05)',
              backgroundColor: isAudioEnabled ? '#76a6f6' : '#d32f2f',
              color: 'white',
              boxShadow: `0 6px 24px ${isAudioEnabled ? 'rgba(118, 166, 246, 0.4)' : 'rgba(244, 67, 54, 0.4)'}`,
            },
          }}
        >
          {isAudioEnabled ? <MicIcon sx={{ fontSize: { xs: 20, sm: 24 } }} /> : <MicOffIcon sx={{ fontSize: { xs: 20, sm: 24 } }} />}
        </IconButton>

        {/* Video Toggle */}
        <IconButton
          onClick={handleToggleVideo}
          sx={{
            width: { xs: 48, sm: 56 },
            height: { xs: 48, sm: 56 },
            backgroundColor: isVideoEnabled 
              ? 'rgba(118, 166, 246, 0.15)' 
              : 'rgba(244, 67, 54, 0.9)',
            backdropFilter: 'blur(10px)',
            color: isVideoEnabled ? '#76a6f6' : 'white',
            border: `2px solid ${isVideoEnabled ? '#76a6f6' : '#f44336'}`,
            boxShadow: `0 4px 20px ${isVideoEnabled ? 'rgba(118, 166, 246, 0.25)' : 'rgba(244, 67, 54, 0.3)'}`,
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: 'scale(1.05)',
              backgroundColor: isVideoEnabled ? '#76a6f6' : '#d32f2f',
              color: 'white',
              boxShadow: `0 6px 24px ${isVideoEnabled ? 'rgba(118, 166, 246, 0.4)' : 'rgba(244, 67, 54, 0.4)'}`,
            },
          }}
        >
          {isVideoEnabled ? <VideocamIcon sx={{ fontSize: { xs: 20, sm: 24 } }} /> : <VideocamOffIcon sx={{ fontSize: { xs: 20, sm: 24 } }} />}
        </IconButton>

        {/* Chat Toggle with Badge */}
        <Badge 
          badgeContent={unreadMessages} 
          color="error"
          sx={{
            '& .MuiBadge-badge': {
              backgroundColor: '#ff4444',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '10px',
              minWidth: '16px',
              height: '16px',
            }
          }}
        >
          <IconButton
            onClick={handleToggleChat}
            sx={{
              width: { xs: 48, sm: 56 },
              height: { xs: 48, sm: 56 },
              backgroundColor: showChat 
                ? '#76a6f6' 
                : 'rgba(118, 166, 246, 0.15)',
              backdropFilter: 'blur(10px)',
              color: showChat ? 'white' : '#76a6f6',
              border: '2px solid #76a6f6',
              boxShadow: '0 4px 20px rgba(118, 166, 246, 0.25)',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'scale(1.05)',
                backgroundColor: '#76a6f6',
                color: 'white',
                boxShadow: '0 6px 24px rgba(118, 166, 246, 0.4)',
              },
            }}
          >
            <ChatIcon sx={{ fontSize: { xs: 20, sm: 24 } }} />
          </IconButton>
        </Badge>

        {/* End Call */}
        <IconButton
          onClick={onEndCall}
          sx={{
            width: { xs: 48, sm: 56 },
            height: { xs: 48, sm: 56 },
            backgroundColor: '#f44336',
            backdropFilter: 'blur(10px)',
            color: 'white',
            border: '2px solid #f44336',
            boxShadow: '0 4px 20px rgba(244, 67, 54, 0.3)',
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: 'scale(1.05)',
              backgroundColor: '#d32f2f',
              boxShadow: '0 6px 24px rgba(244, 67, 54, 0.4)',
            },
          }}
        >
          <CallEndIcon sx={{ fontSize: { xs: 20, sm: 24 } }} />
        </IconButton>
      </Box>

      {showWhiteboard && (
        <WhiteboardCanvas
          socketManager={socketManager}
          isVisible={showWhiteboard}
          onClose={() => setShowWhiteboard(false)}
          callId={callData?.callId || 'unknown'}
          isTeacher={true}
        />
      )}

      </Box>

      {/* Chat Sidebar - Floating with Glassy Background */}
      <Slide direction="left" in={showChat} mountOnEnter unmountOnExit>
        <Box
          sx={{
            position: 'absolute',
            top: {
              xs: 'max(10px, env(safe-area-inset-top))',  // Safe area aware on mobile
              sm: 'max(20px, env(safe-area-inset-top))',  // Safe area aware on larger screens
            },
            right: {
              xs: 'max(10px, env(safe-area-inset-right))',  // Safe area aware on mobile
              sm: 'max(20px, env(safe-area-inset-right))',  // Safe area aware on larger screens
            },
            width: {
              xs: 'calc(100vw - 20px)', // Almost full width on mobile
              sm: 'calc(100vw - 40px)',  // More margin on tablet
              md: 400,                   // Fixed width on desktop
            },
            maxWidth: {
              xs: '95vw',  // Maximum 95% of screen on mobile
              sm: 350,     // Standard max on tablet
              md: 400,     // Larger on desktop
            },
            height: {
              xs: 'calc(100vh - 120px)',  // Standard height
              '@media (max-height: 500px) and (orientation: landscape)': 'calc(100vh - 80px)',  // Less height in landscape
            },
            // In landscape mode on mobile, make chat smaller and positioned differently
            '@media (max-height: 500px) and (orientation: landscape)': {
              width: '300px',
              maxWidth: '40vw',
              height: 'calc(100vh - 80px)',
            },
            background: 'rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(20px)',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            zIndex: 10001,
          }}
        >
          {/* Chat Header */}
          <Box
            sx={{
              p: 2,
              background: 'rgba(118, 166, 246, 0.2)',
              backdropFilter: 'blur(10px)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '16px 16px 0 0',
            }}
          >
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600, fontSize: '16px', color: '#FFFFFF' }}>
              <ChatIcon sx={{ fontSize: 20, color: '#76a6f6' }} />
              Chat
              {socketManager?.socket?.connected && (
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: '#4caf50',
                    ml: 1,
                  }}
                  title="Connected"
                />
              )}
              {!socketManager?.socket?.connected && (
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: '#f44336',
                    ml: 1,
                  }}
                  title="Disconnected"
                />
              )}
            </Typography>
            <IconButton
              size="medium"
              onClick={handleToggleChat}
              sx={{ 
                color: 'rgba(255, 255, 255, 0.8)',
                borderRadius: 1,
                minWidth: 44,
                minHeight: 44,
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  color: '#FFFFFF',
                }
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          {/* Chat Messages */}
          <Box
            ref={chatContainerRef}
            sx={{
              flex: 1,
              overflowY: 'auto',
              p: 2,
              minHeight: 0,
              '&::-webkit-scrollbar': {
                width: '6px',
              },
              '&::-webkit-scrollbar-track': {
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '3px',
              },
              '&::-webkit-scrollbar-thumb': {
                background: 'rgba(118, 166, 246, 0.6)',
                borderRadius: '3px',
                '&:hover': {
                  background: 'rgba(118, 166, 246, 0.8)',
                },
              },
            }}
          >
            {chatMessages.length === 0 ? (
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: '100%',
                  color: 'rgba(255, 255, 255, 0.7)',
                  flexDirection: 'column',
                  gap: 1,
                }}
              >
                <ChatIcon sx={{ fontSize: 48, opacity: 0.4, color: 'rgba(255, 255, 255, 0.5)' }} />
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>No messages yet</Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>Start a conversation!</Typography>
              </Box>
            ) : (
              chatMessages.map((msg) => (
                <Box
                  key={msg.id}
                  sx={{
                    mb: 1.5,
                    p: 1.5,
                    borderRadius: 2,
                    backgroundColor: msg.isOwnMessage 
                      ? 'rgba(118, 166, 246, 0.9)' 
                      : 'rgba(255, 255, 255, 0.15)',
                    backdropFilter: 'blur(10px)',
                    marginLeft: msg.isOwnMessage ? 4 : 0,
                    marginRight: msg.isOwnMessage ? 0 : 4,
                    border: msg.isOwnMessage ? '1px solid rgba(118, 166, 246, 0.3)' : '1px solid rgba(255, 255, 255, 0.2)',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5, color: msg.isOwnMessage ? '#ffffff' : 'rgba(255, 255, 255, 0.9)', fontSize: '13px' }}>
                    {msg.sender}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 0.5, color: msg.isOwnMessage ? '#ffffff' : 'rgba(255, 255, 255, 0.95)', lineHeight: 1.4 }}>
                    {msg.message}
                  </Typography>
                  <Typography variant="caption" sx={{ color: msg.isOwnMessage ? 'rgba(255, 255, 255, 0.7)' : 'rgba(255, 255, 255, 0.6)', fontSize: '11px' }}>
                    {msg.timestamp.toLocaleTimeString()}
                  </Typography>
                </Box>
              ))
            )}
          </Box>

          <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.2)' }} />

          {/* Message Input - Fixed at bottom */}
          <Box 
            sx={{ 
              p: 2,
              background: 'rgba(118, 166, 246, 0.15)',
              backdropFilter: 'blur(10px)',
              borderTop: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '0 0 16px 16px',
              flexShrink: 0,
            }}
          >
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
              <Box sx={{ flex: 1, position: 'relative' }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  multiline
                  maxRows={3}
                  variant="outlined"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(10px)',
                      color: '#ffffff',
                      borderRadius: 2,
                      '& fieldset': {
                        borderColor: 'rgba(255, 255, 255, 0.3)',
                      },
                      '&:hover fieldset': {
                        borderColor: 'rgba(118, 166, 246, 0.7)',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#76a6f6',
                      },
                    },
                    '& .MuiInputBase-input::placeholder': {
                      color: 'rgba(255, 255, 255, 0.7)',
                    },
                  }}
                  InputProps={{
                    endAdornment: (
                      <IconButton
                        size="medium"
                        onClick={handleEmojiClick}
                        sx={{ 
                          p: 0.5,
                          minWidth: 44,
                          minHeight: 44
                        }}
                      >
                        <EmojiIcon sx={{ fontSize: 20, color: 'rgba(255, 255, 255, 0.7)' }} />
                      </IconButton>
                    )
                  }}
                />
              </Box>
              <span>
                <IconButton
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  sx={{
                    backgroundColor: '#76a6f6',
                    color: 'white',
                    borderRadius: 2,
                    boxShadow: '0 4px 12px rgba(118, 166, 246, 0.3)',
                    '&:hover': {
                      backgroundColor: '#5a91e6',
                      transform: 'translateY(-1px)',
                      boxShadow: '0 6px 16px rgba(118, 166, 246, 0.4)',
                    },
                    '&:disabled': {
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      color: 'rgba(255, 255, 255, 0.5)',
                      boxShadow: 'none',
                      transform: 'none',
                    }
                  }}
                >
                  <SendIcon />
                </IconButton>
              </span>
            </Box>

            {/* Emoji Picker Popover */}
            <Popover
              open={Boolean(emojiAnchorEl)}
              anchorEl={emojiAnchorEl}
              onClose={handleEmojiClose}
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'left',
              }}
              transformOrigin={{
                vertical: 'bottom',
                horizontal: 'left',
              }}
              sx={{ zIndex: 10005 }}
            >
              <Box
                sx={{
                  p: 2,
                  maxWidth: {
                    xs: '95vw',  // Responsive on mobile
                    sm: 300,     // Fixed on larger screens
                  },
                  background: 'rgba(0, 0, 0, 0.8)',
                  backdropFilter: 'blur(20px)',
                  borderRadius: 2,
                  border: '1px solid rgba(118, 166, 246, 0.3)',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(6, 1fr)',
                  gap: 1,
                }}
              >
                {commonEmojis.map((emoji, index) => (
                  <IconButton
                    key={index}
                    onClick={() => addEmoji(emoji)}
                    sx={{
                      fontSize: '1.2rem',
                      width: 44,
                      height: 44,
                      color: 'white',
                      '&:hover': {
                        backgroundColor: 'rgba(118, 166, 246, 0.3)',
                      }
                    }}
                  >
                    {emoji}
                  </IconButton>
                ))}
              </Box>
            </Popover>
          </Box>
        </Box>
      </Slide>

      {/* Live Transcription Overlay - Hidden but STT still running in background */}
      {false /* showTranscription disabled to hide from teacher */ && isTranscriptionEnabled && (
        <Slide direction="up" in={showTranscription} mountOnEnter unmountOnExit>
          <Box
            sx={{
              position: 'absolute',
              bottom: '120px',
              left: {
                xs: '10px',  // Less margin on mobile
                sm: '20px',  // Standard margin on larger screens
              },
              width: {
                xs: 'calc(100vw - 20px)',  // Almost full width on mobile
                sm: 'calc(100vw - 40px)',   // More margin on tablet
                md: 450,                    // Fixed width on desktop
              },
              maxWidth: {
                xs: '95vw',  // Ensure it doesn't overflow on mobile
                md: 450,     // Original width on desktop
              },
              maxHeight: 350,
              background: 'rgba(0, 0, 0, 0.85)',
              backdropFilter: 'blur(20px)',
              borderRadius: '16px',
              border: '1px solid rgba(118, 166, 246, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
              zIndex: 10001,
            }}
          >
            {/* Transcription Header */}
            <Box
              sx={{
                p: 2,
                background: 'rgba(118, 166, 246, 0.2)',
                backdropFilter: 'blur(10px)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '16px 16px 0 0',
              }}
            >
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600, fontSize: '16px' }}>
                <SubtitlesIcon sx={{ fontSize: 20, color: '#76a6f6' }} />
                Live Transcription
                <Chip
                  label={connectionStatus}
                  size="small"
                  color={connectionStatus === 'connected' ? 'success' : connectionStatus === 'connecting' ? 'warning' : 'error'}
                  variant="outlined"
                  sx={{ ml: 1, fontSize: '11px' }}
                />
                
                {/* Audio Level Indicators */}
                {connectionStatus === 'connected' && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography variant="caption" sx={{ fontSize: '10px', color: '#76a6f6' }}>
                        Mic
                      </Typography>
                      <Box
                        sx={{
                          width: 40,
                          height: 4,
                          bgcolor: 'rgba(255,255,255,0.1)',
                          borderRadius: 2,
                          overflow: 'hidden'
                        }}
                      >
                        <Box
                          sx={{
                            width: `${micAudioLevel}%`,
                            height: '100%',
                            bgcolor: micAudioLevel > 10 ? '#76a6f6' : '#666',
                            transition: 'width 0.1s ease',
                            borderRadius: 2
                          }}
                        />
                      </Box>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography variant="caption" sx={{ fontSize: '10px', color: '#76a6f6' }}>
                        Speaker
                      </Typography>
                      <Box
                        sx={{
                          width: 40,
                          height: 4,
                          bgcolor: 'rgba(255,255,255,0.1)',
                          borderRadius: 2,
                          overflow: 'hidden'
                        }}
                      >
                        <Box
                          sx={{
                            width: `${speakerAudioLevel}%`,
                            height: '100%',
                            bgcolor: speakerAudioLevel > 10 ? '#76a6f6' : '#666',
                            transition: 'width 0.1s ease',
                            borderRadius: 2
                          }}
                        />
                      </Box>
                    </Box>
                  </Box>
                )}
                
                {/* Language Display (controlled from Settings) */}
                {connectionStatus === 'connected' && (
                  <Box sx={{ ml: 2, fontSize: '11px', color: '#76a6f6' }}>
                    {SUPPORTED_LANGUAGES[selectedLanguage]?.flag} {SUPPORTED_LANGUAGES[selectedLanguage]?.name}
                  </Box>
                )}
                
                {connectionStatus === 'disconnected' && (
                  <IconButton
                    size="small"
                    onClick={initializeDirectSTT}
                    title="Retry STT connection"
                    sx={{ 
                      color: 'rgba(255, 255, 255, 0.8)',
                      ml: 1,
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        color: '#FFFFFF',
                      }
                    }}
                  >
                    <SettingsIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                )}
              </Typography>
              <IconButton
                size="medium"
                onClick={handleToggleTranscriptionDisplay}
                sx={{ 
                  color: 'rgba(255, 255, 255, 0.8)',
                  minWidth: 44,
                  minHeight: 44,
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    color: '#FFFFFF',
                  }
                }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>

            {/* Transcription Content */}
            <Box
              ref={transcriptionRef}
              sx={{
                flex: 1,
                overflowY: 'auto',
                p: 2,
                minHeight: 0,
                maxHeight: 250,
                '&::-webkit-scrollbar': {
                  width: '6px',
                },
                '&::-webkit-scrollbar-track': {
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '3px',
                },
                '&::-webkit-scrollbar-thumb': {
                  background: 'rgba(118, 166, 246, 0.6)',
                  borderRadius: '3px',
                  '&:hover': {
                    background: 'rgba(118, 166, 246, 0.8)',
                  },
                },
              }}
            >
              {transcriptions.length === 0 ? (
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100%',
                    color: 'rgba(255, 255, 255, 0.7)',
                    flexDirection: 'column',
                    gap: 1,
                  }}
                >
                  <SubtitlesIcon sx={{ fontSize: 48, opacity: 0.4 }} />
                  <Typography variant="body2">
                    {connectionStatus === 'connected' 
                      ? 'Listening for speech...' 
                      : connectionStatus === 'connecting'
                      ? 'Connecting to STT service...'
                      : 'STT service not connected'}
                  </Typography>
                </Box>
              ) : (
                transcriptions.map((transcription) => (
                  <Box
                    key={transcription.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 1,
                      mb: 1.5,
                      p: 1.5,
                      borderRadius: 2,
                      backgroundColor: transcription.participantType === 'teacher' 
                        ? 'rgba(118, 166, 246, 0.2)'
                        : 'rgba(76, 175, 80, 0.2)',
                      border: `1px solid ${transcription.participantType === 'teacher'
                        ? 'rgba(118, 166, 246, 0.4)'
                        : 'rgba(76, 175, 80, 0.4)'}`,
                      opacity: transcription.isFinal ? 1 : 0.7,
                    }}
                  >
                    <Box
                      sx={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        backgroundColor: transcription.participantType === 'teacher'
                          ? '#76a6f6'
                          : '#4CAF50',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {transcription.participantType === 'teacher' ? 
                        <PersonIcon sx={{ fontSize: 16, color: 'white' }} /> : 
                        <SchoolIcon sx={{ fontSize: 16, color: 'white' }} />
                      }
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 600,
                          color: transcription.participantType === 'teacher' ? '#76a6f6' : '#4CAF50',
                          textTransform: 'capitalize',
                          display: 'block',
                          mb: 0.5,
                        }}
                      >
                        {transcription.participantType}
                        {!transcription.isFinal && ' (speaking...)'}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          color: '#FFFFFF',
                          wordWrap: 'break-word',
                          fontStyle: transcription.isFinal ? 'normal' : 'italic',
                          lineHeight: 1.4,
                        }}
                      >
                        {transcription.text}
                      </Typography>
                      {transcription.isFinal && transcription.confidence && (
                        <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '11px' }}>
                          {(transcription.confidence * 100).toFixed(0)}% confidence
                        </Typography>
                      )}
                    </Box>
                  </Box>
                ))
              )}
            </Box>

            {/* Transcription Controls */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                p: 1.5,
                borderTop: '1px solid rgba(255, 255, 255, 0.2)',
                backgroundColor: 'rgba(118, 166, 246, 0.1)',
                borderRadius: '0 0 16px 16px',
              }}
            >
              <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                {transcriptions.filter(t => t.isFinal).length} transcriptions
              </Typography>
              <IconButton
                size="medium"
                onClick={toggleTranscription}
                sx={{
                  backgroundColor: isTranscriptionEnabled ? '#76a6f6' : 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  minWidth: 44,
                  minHeight: 44,
                  '&:hover': {
                    backgroundColor: isTranscriptionEnabled ? '#5a91e6' : 'rgba(255, 255, 255, 0.3)',
                  },
                }}
              >
                {isTranscriptionEnabled ? <SubtitlesIcon /> : <SubtitlesOffIcon />}
              </IconButton>
            </Box>
          </Box>
        </Slide>
      )}

      {/* Hand Raise Notification Popup */}
      <Dialog
        open={showRaiseHandPopup}
        onClose={handleDismissPopup}
        maxWidth={false}
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: '#2d2d30',
            color: '#e8e8e8',
            border: '2px solid #ff9800',
            maxWidth: {
              xs: '95vw',  // Almost full width on mobile
              sm: '400px', // Fixed width on larger screens
            },
            margin: {
              xs: '16px',  // Small margin on mobile
              sm: 'auto',  // Centered on larger screens
            },
          }
        }}
      >
        <DialogTitle sx={{ 
          backgroundColor: '#ff9800', 
          color: 'white', 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1 
        }}>
          <Box sx={{ fontSize: '24px' }}>✋</Box>
          Student Hand Raised
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {Array.from(raisedHands.entries()).map(([studentId, handInfo]) => (
            <Box
              key={studentId}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                p: 1,
                mb: 1,
                backgroundColor: '#3d3d40',
                borderRadius: 1,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ fontSize: '20px' }}>✋</Box>
                <Typography variant="body1">
                  {handInfo.name} wants to speak
                </Typography>
              </Box>
              <Typography variant="caption" sx={{ color: '#a0a0a0' }}>
                {new Date(handInfo.timestamp).toLocaleTimeString()}
              </Typography>
            </Box>
          ))}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleDismissPopup}
            sx={{ color: '#e8e8e8' }}
          >
            Dismiss
          </Button>
          {Array.from(raisedHands.keys()).map(studentId => (
            <Button
              key={studentId}
              onClick={() => handleAcknowledgeHand(studentId)}
              variant="contained"
              sx={{
                backgroundColor: '#ff9800',
                '&:hover': {
                  backgroundColor: '#f57c00',
                }
              }}
            >
              Acknowledge
            </Button>
          ))}
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default VideoCallWindow;
