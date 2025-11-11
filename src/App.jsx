import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline, Snackbar, Alert } from '@mui/material';
import { modernTheme } from './theme/modernTheme';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import StudentMessages from './pages/StudentMessages';
import Settings from './pages/Settings';
import CallLogsPage from './components/CallLogsPage';
import ModernLayout from './components/ModernLayout';
import { CacheProvider } from './contexts/CacheContext';
import { io } from 'socket.io-client';
import { Capacitor } from '@capacitor/core';
import { SOCKET_URL } from './config/environment';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import VideoCallWindow from './components/VideoCallWindow';
import MobileVideoCallWindow from './components/MobileVideoCallWindow';
import IncomingCallModal from './components/IncomingCallModal';
import ErrorBoundary from './components/ErrorBoundary';
import WebRTCService from './services/WebRTCService';
import CallService from './services/CallService';
import UserService from './services/UserService';
import PushNotificationService from './services/PushNotificationService';
import { initializeAppConfig, getAppConfig } from './services/AppConfigService.js';

// Simple token manager
class TokenManager {
  constructor() {
    this.token = null;
  }
  saveToken(token) {
    this.token = token;
    localStorage.setItem('firebase_token', token);
  }
  clearToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('firebase_token');
  }
}

// Socket Manager
class SocketManager {
  constructor() {
    this.socket = null;
    this.eventHandlers = new Map();
    this.connected = false;
  }

  connect(baseUrl, userData) {
    if (this.socket) {
      this.disconnect();
    }

    try {
      this.socket = io(baseUrl, {
        transports: ['websocket', 'polling'],
        autoConnect: true,
        forceNew: true,
        timeout: 10000
      });

      this.socket.on('connect', () => {
        this.connected = true;
        this.socket.userData = userData;
        this.socket.emit('join-room', userData);
        this.emit('connected', { socket: this.socket, userData });
      });

      this.socket.on('disconnect', () => {
        this.connected = false;
        this.emit('disconnected');
      });

      this.socket.on('receive-message', (messageData) => {
        this.emit('message-received', messageData);
      });

      this.socket.on('ai-alert', (alertData) => {
        this.emit('ai-alert', alertData);
      });

      this.socket.on('error', (error) => {
        console.error('Socket error:', error);
      });

      this.socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        this.emit('connection-error', error);
      });
    } catch (error) {
      console.error('Failed to initialize socket:', error);
    }
  }

  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }

  off(event, handler) {
    if (this.eventHandlers.has(event)) {
      const handlers = this.eventHandlers.get(event);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event).forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in ${event} handler:`, error);
        }
      });
    }
  }

  sendMessage(messageData) {
    if (this.socket && this.connected) {
      this.socket.emit('send-message', messageData);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.connected = false;
    this.eventHandlers.clear();
  }
}

const tokenManager = new TokenManager();
const socketManager = new SocketManager();

function App() {
  const isNativeMobile = Capacitor.isNativePlatform();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [webrtcService] = useState(() => {
    try {
      return new WebRTCService();
    } catch (error) {
      console.error('Failed to initialize WebRTC service:', error);
      return null;
    }
  });

  // Call state
  const [showIncomingCall, setShowIncomingCall] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const [isInMeeting, setIsInMeeting] = useState(false);
  const [meetingStatus, setMeetingStatus] = useState('idle');
  const [currentMeeting, setCurrentMeeting] = useState(null);
  const [currentCallId, setCurrentCallId] = useState(null);
  const [callStartTime, setCallStartTime] = useState(null);
  const [callToast, setCallToast] = useState({ open: false, message: '', severity: 'info' });

  const showCallToast = (message, severity = 'info') => {
    setCallToast({ open: true, message, severity });
  };

  const handleToastClose = (_, reason) => {
    if (reason === 'clickaway') return;
    setCallToast((prev) => ({ ...prev, open: false }));
  };

  // Initialize app config
  useEffect(() => {
    let isMounted = true;
    let authUnsubscribe = null;

    const init = async () => {
      // Failsafe: Force loading to complete after 10 seconds
      const failsafeTimeout = setTimeout(() => {
        console.warn('⏰ Loading timeout - forcing to login screen');
        if (isMounted) {
          setLoading(false);
        }
      }, 10000);

      try {
        console.log('🔧 Initializing app config...');
        await initializeAppConfig();

        if (!isMounted) {
          clearTimeout(failsafeTimeout);
          return;
        }

        // Configure WebRTC with TURN server
        if (webrtcService) {
          const config = getAppConfig();
          if (config?.turn?.username && config?.turn?.credential) {
            webrtcService.configureTurnServer(config.turn);
          }
        }
      } catch (error) {
        console.error('Failed to initialize app config:', error);
        // Continue anyway with defaults
      }

      // Check auth state
      if (!isMounted) {
        clearTimeout(failsafeTimeout);
        return;
      }

      authUnsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (!isMounted) return;

        console.log('🔐 Auth state changed:', firebaseUser ? 'signed in' : 'not signed in');

        if (firebaseUser) {
          try {
            console.log('📄 Fetching user document...');
            const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));

            if (userDoc.exists() && userDoc.data().role === 'student') {
              const userData = userDoc.data();
              const user = {
                id: firebaseUser.uid,
                email: firebaseUser.email,
                username: userData.username || firebaseUser.displayName,
                role: userData.role,
                ...userData
              };

              console.log('✅ Authenticated:', user.username);
              setUser(user);
              setIsAuthenticated(true);

              // Connect socket
              const { socketUrl } = getAppConfig();
              socketManager.connect(socketUrl || SOCKET_URL, {
                userId: user.id,
                username: user.username,
                role: 'student'
              });

              UserService.setOnline();
              setTimeout(() => UserService.setupOnlineStatusTracking(), 1000);
            } else {
              console.warn('⚠️ User not student or not found');
              await signOut(auth);
            }
          } catch (error) {
            console.error('❌ Error verifying user:', error);
            await signOut(auth);
          }
        } else {
          console.log('👤 No user - showing login screen');
        }

        clearTimeout(failsafeTimeout);
        setLoading(false);
      });
    };

    init();

    return () => {
      isMounted = false;
      if (authUnsubscribe) {
        authUnsubscribe();
      }
    };
  }, [webrtcService]);

  // Setup WebRTC when socket connects
  useEffect(() => {
    const handleSocketConnected = (data) => {
      if (webrtcService && data.socket && data.userData) {
        webrtcService.initialize(data.socket, data.userData.userId);
        setupWebRTCEventHandlers();
      }
    };

    if (socketManager.connected && webrtcService && !webrtcService.socket) {
      const socketUserData = {
        userId: user?.id,
        username: user?.username,
        role: 'student'
      };
      webrtcService.initialize(socketManager.socket, socketUserData.userId);
      setupWebRTCEventHandlers();
    }

    socketManager.on('connected', handleSocketConnected);

    return () => {
      socketManager.off('connected', handleSocketConnected);
    };
  }, [webrtcService, user]);

  // Call logging
  useEffect(() => {
    if (!webrtcService) return;

    const handleCallStarted = async (event) => {
      const callResult = await CallService.startCall(
        event.detail.teacherId || event.detail.callerId,
        event.detail.teacherName || event.detail.callerName || 'Teacher',
        'video'
      );
      if (callResult.success) {
        setCurrentCallId(callResult.callId);
        setCallStartTime(new Date());
      }
    };

    const handleCallEnded = async (event) => {
      if (currentCallId) {
        await CallService.endCall(currentCallId, event.detail.reason || 'normal');
        setCurrentCallId(null);
        setCallStartTime(null);
      }
    };

    webrtcService.addEventListener('call-started', handleCallStarted);
    webrtcService.addEventListener('call-ended', handleCallEnded);

    return () => {
      webrtcService.removeEventListener('call-started', handleCallStarted);
      webrtcService.removeEventListener('call-ended', handleCallEnded);
    };
  }, [webrtcService, currentCallId]);

  const setupWebRTCEventHandlers = () => {
    if (!webrtcService) return;

    webrtcService.addEventListener('incoming-call', (event) => {
      setIncomingCall({
        type: 'webrtc-call',
        callId: event.detail.callId,
        callerId: event.detail.callerId,
        callerName: event.detail.callerName,
        offer: event.detail.offer
      });
      setShowIncomingCall(true);
    });

    webrtcService.addEventListener('call-started', async (event) => {
      setMeetingStatus('connecting');
      setCurrentMeeting(event.detail);
      setIsInMeeting(true);

      const callResult = await CallService.startCall(
        event.detail.teacherId || event.detail.callerId,
        event.detail.teacherName || event.detail.callerName || 'Teacher',
        'video'
      );

      if (callResult.success) {
        setCurrentCallId(callResult.callId);
      }
    });

    webrtcService.addEventListener('call-connected', () => {
      setMeetingStatus('connected');
    });

    webrtcService.addEventListener('call-answered', (event) => {
      setMeetingStatus('connecting');
      const meetingData = {
        ...event.detail,
        teacherName: incomingCall?.callerName || 'Teacher'
      };
      setCurrentMeeting(meetingData);
      setTimeout(() => setIsInMeeting(true), 500);
    });

    webrtcService.addEventListener('remote-stream', () => {
      if (meetingStatus === 'connecting') {
        setMeetingStatus('connected');
      }
    });

    webrtcService.addEventListener('call-ended', () => {
      handleMeetingEnd('completed');
    });

    webrtcService.addEventListener('call-rejected', (event) => {
      const reason = event.detail?.reason;
      const wasRinging = showIncomingCall && !isInMeeting;

      if (wasRinging) {
        if (reason === 'auto-timeout' || reason === 'cancelled-by-teacher' || !reason) {
          showCallToast('Missed call.', 'warning');
        } else if (reason === 'already-in-call') {
          showCallToast('Call ignored on this device (already in a call).', 'info');
        }
      }

      handleMeetingEnd('rejected');
    });

    webrtcService.addEventListener('incoming-call-cancelled', () => {
      setShowIncomingCall(false);
      setIncomingCall(null);
      showCallToast('Call answered on another device.', 'info');
      PushNotificationService.dismissLastInvite().catch((err) => {
        console.warn('Failed to cancel notification:', err);
      });
    });
  };

  const handleLogin = async (email, password) => {
    console.log('🔑 Login attempt started...');

    try {
      // Use Firebase REST API instead of SDK - bypasses iOS WebView issues
      console.log('🔐 Authenticating via Firebase REST API...');

      const response = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyDrXbi2vqMua2jwvoEOsdEccUEGZAonIS4`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            password,
            returnSecureToken: true
          })
        }
      );

      if (!response.ok) {
        const error = await response.json();
        console.error('❌ Firebase REST API error:', error);

        let errorMessage = 'Login failed';
        if (error.error?.message === 'EMAIL_NOT_FOUND') {
          errorMessage = 'No account found with this email';
        } else if (error.error?.message === 'INVALID_PASSWORD' || error.error?.message === 'INVALID_LOGIN_CREDENTIALS') {
          errorMessage = 'Invalid email or password';
        } else if (error.error?.message) {
          errorMessage = error.error.message.replace(/_/g, ' ').toLowerCase();
        }

        return { success: false, error: errorMessage };
      }

      const authData = await response.json();
      console.log('✅ Firebase REST auth successful, UID:', authData.localId);

      // Fetch user document from Firestore
      console.log('📄 Fetching user document...');
      const userDoc = await getDoc(doc(db, 'users', authData.localId));
      console.log('✅ User document fetched');

      if (!userDoc.exists()) {
        console.error('❌ User document not found');
        throw new Error('User not found in database');
      }

      const userData = userDoc.data();

      if (userData.role !== 'student') {
        console.error('❌ User is not a student, role:', userData.role);
        throw new Error('Student access required');
      }

      const user = {
        id: authData.localId,
        email: authData.email,
        username: userData.username || authData.displayName || email.split('@')[0],
        role: userData.role,
        ...userData
      };

      console.log('👤 Setting user state:', user.username);
      setUser(user);
      setIsAuthenticated(true);

      // Save token
      tokenManager.saveToken(authData.idToken);

      // Do these async operations in background - don't block login
      setTimeout(async () => {
        try {
          console.log('🔌 Connecting socket...');
          const { socketUrl } = getAppConfig();
          socketManager.connect(socketUrl || SOCKET_URL, {
            userId: user.id,
            username: user.username,
            role: 'student'
          });

          console.log('🟢 Setting user online...');
          UserService.setOnline();
          setTimeout(() => UserService.setupOnlineStatusTracking(), 1000);

          console.log('🔔 Initializing push notifications...');
          try {
            await PushNotificationService.initialize(user);
            console.log('✅ Push notifications initialized');
          } catch (pushError) {
            console.error('⚠️ Failed to initialize push notifications:', pushError);
          }
        } catch (err) {
          console.error('⚠️ Background initialization error:', err);
        }
      }, 100);

      console.log('✅ Login complete!');
      return { success: true };
    } catch (error) {
      console.error('❌ Login error:', error);

      let errorMessage = 'Login failed';
      if (error.message) {
        errorMessage = error.message;
      }

      return { success: false, error: errorMessage };
    }
  };

  const handleLogout = async () => {
    handleMeetingEnd();
    await UserService.setOffline();
    await PushNotificationService.clear();

    try {
      await signOut(auth);
    } catch (error) {
      console.error('Sign out error:', error);
    }

    tokenManager.clearToken();
    socketManager.disconnect();
    setUser(null);
    setIsAuthenticated(false);
  };

  const handleAcceptCall = async () => {
    try {
      if (!webrtcService) {
        throw new Error('WebRTC service not initialized');
      }

      setShowIncomingCall(false);
      await webrtcService.answerCall(incomingCall);
    } catch (error) {
      console.error('Failed to accept call:', error);
      alert('Failed to answer call: ' + error.message);
      handleMeetingEnd();
    }
  };

  const handleRejectCall = (options = {}) => {
    const reason = options.reason || 'user-rejected';

    if (reason === 'auto-timeout') {
      showCallToast('Missed call.', 'warning');
    } else if (reason === 'user-declined' || reason === 'user-rejected') {
      showCallToast('Call declined.', 'info');
    }

    const emitReason = reason === 'user-declined' ? 'user-rejected' : reason;

    if (webrtcService && incomingCall) {
      webrtcService.rejectCall(incomingCall.callId, incomingCall.callerId, emitReason);
    }

    setShowIncomingCall(false);
    setIncomingCall(null);
  };

  const handleMeetingEnd = async (endReason = 'completed') => {
    if (currentCallId && callStartTime) {
      const endTime = new Date();
      const durationInSeconds = Math.round((endTime - callStartTime) / 1000);

      const endResult = await CallService.endCall(currentCallId, endReason);
      if (endResult.success) {
        await CallService.updateCallDuration(currentCallId, durationInSeconds);
      }
    }

    if (webrtcService && webrtcService.getStatus().isInCall) {
      webrtcService.endCall();
    }

    setIsInMeeting(false);
    setMeetingStatus('idle');
    setCurrentMeeting(null);
    setShowIncomingCall(false);
    setIncomingCall(null);
    setCurrentCallId(null);
    setCallStartTime(null);
  };

  // SIMPLE LOADING SCREEN
  if (loading) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: '#667eea',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        color: 'white',
        fontFamily: 'Arial, sans-serif'
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '4px solid rgba(255,255,255,0.3)',
          borderTop: '4px solid white',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <div style={{ marginTop: '20px', fontSize: '18px' }}>Loading Student App...</div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // LOGIN SCREEN
  if (!isAuthenticated) {
    return (
      <ThemeProvider theme={modernTheme}>
        <CssBaseline />
        <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
          <Login onLogin={handleLogin} />
        </div>
      </ThemeProvider>
    );
  }

  // MAIN APP
  return (
    <ThemeProvider theme={modernTheme}>
      <CssBaseline />
      <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
        <CacheProvider apiClient={null}>
          <Routes>
            <Route path="/*" element={
              <ModernLayout user={user} onLogout={handleLogout}>
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<Dashboard user={user} webrtcService={webrtcService} />} />
                  <Route path="/messages" element={<StudentMessages user={user} />} />
                  <Route path="/call-logs" element={<CallLogsPage />} />
                  <Route path="/settings" element={<Settings user={user} />} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </ModernLayout>
            } />
          </Routes>

          <IncomingCallModal
            open={showIncomingCall}
            callerName={incomingCall?.callerName || 'Teacher'}
            callerInfo={incomingCall?.callerInfo}
            onAccept={handleAcceptCall}
            onReject={handleRejectCall}
          />

          {isInMeeting && (
            <ErrorBoundary>
              {isNativeMobile ? (
                <MobileVideoCallWindow
                  isOpen={isInMeeting}
                  callData={currentMeeting}
                  callStatus={meetingStatus}
                  onEndCall={handleMeetingEnd}
                  webrtcService={webrtcService}
                  socketManager={socketManager}
                />
              ) : (
                <VideoCallWindow
                  isOpen={isInMeeting}
                  callData={currentMeeting}
                  callStatus={meetingStatus}
                  onEndCall={handleMeetingEnd}
                  webrtcService={webrtcService}
                  socketManager={socketManager}
                />
              )}
            </ErrorBoundary>
          )}

          <Snackbar
            open={callToast.open}
            autoHideDuration={4000}
            onClose={handleToastClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          >
            <Alert onClose={handleToastClose} severity={callToast.severity} variant="filled">
              {callToast.message}
            </Alert>
          </Snackbar>
        </CacheProvider>
      </div>
    </ThemeProvider>
  );
}

export default App;
