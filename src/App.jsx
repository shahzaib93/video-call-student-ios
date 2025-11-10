import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, ThemeProvider, CssBaseline, Snackbar, Alert } from '@mui/material';
import { modernTheme } from './theme/modernTheme';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import StudentMessages from './pages/StudentMessages';
import Settings from './pages/Settings';
import CallLogsPage from './components/CallLogsPage';
import ModernLayout from './components/ModernLayout';
import { CacheProvider } from './contexts/CacheContext';
import { io } from 'socket.io-client';

// Capacitor imports for mobile app support
import { Capacitor } from '@capacitor/core';

import { SOCKET_URL } from './config/environment';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './config/firebase';
import { doc, getDoc } from 'firebase/firestore';

// Import WebRTC call components
import VideoCallWindow from './components/VideoCallWindow';
import MobileVideoCallWindow from './components/MobileVideoCallWindow';
import IncomingCallModal from './components/IncomingCallModal';
import ErrorBoundary from './components/ErrorBoundary';
import WebRTCService from './services/WebRTCService';
import CallService from './services/CallService';
import UserService from './services/UserService';
import PushNotificationService from './services/PushNotificationService';
import {
  initializeAppConfig,
  getAppConfig,
  onAppConfigChange,
  disposeAppConfig
} from './services/AppConfigService.js';

// Simple token manager for compatibility with WebRTC service
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

// Socket Manager for real-time features using Socket.IO
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
        
        // Store user data on the socket instance for downstream consumers (match desktop build)
        this.socket.userData = userData;

        // Join user's room
        this.socket.emit('join-room', userData);
        
        this.emit('connected', { socket: this.socket, userData });
      });

      this.socket.on('disconnect', () => {
        this.connected = false;
        this.emit('disconnected');
      });

      // Listen for incoming messages
      this.socket.on('receive-message', (messageData) => {
        this.emit('message-received', messageData);
      });

      // Listen for AI alerts
      this.socket.on('ai-alert', (alertData) => {
        this.emit('ai-alert', alertData);
      });

      // Also listen for any socket errors
      this.socket.on('error', (error) => {
        console.error('🔍 Student: Socket error:', error);
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
    } else {
      console.error('Socket not connected, cannot send message. Connected:', this.connected, 'Socket exists:', !!this.socket);
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
  // Mobile platform detection
  const isNativeMobile = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform();
  
  // Add global error handler for debugging mobile crashes
  useEffect(() => {
    const handleError = (error) => {
      console.error('🚨 Global Error:', error);
    };
    
    const handleUnhandledRejection = (event) => {
      console.error('🚨 Unhandled Promise Rejection:', event.reason);
    };
    
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [configReady, setConfigReady] = useState(false);
  const [appError, setAppError] = useState(null);
  const [initStatus, setInitStatus] = useState('Starting...');
  
  // WebRTC service with coturn TURN server
  const [webrtcService] = useState(() => {
    try {
      const service = new WebRTCService(); // Uses your coturn server by default
      return service;
    } catch (error) {
      console.error('❌ Failed to initialize WebRTC service:', error);
      console.error('❌ WebRTC Error Stack:', error.stack);
      // Don't crash the app if WebRTC fails - continue without it
      return null;
    }
  });
  const [showIncomingCall, setShowIncomingCall] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const [isInMeeting, setIsInMeeting] = useState(false);
  const [meetingStatus, setMeetingStatus] = useState('idle'); // idle, connecting, connected, ended
  const [currentMeeting, setCurrentMeeting] = useState(null);
  const [meetingUrl, setMeetingUrl] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [currentCallId, setCurrentCallId] = useState(null);
  const [callStartTime, setCallStartTime] = useState(null);
  const [callToast, setCallToast] = useState({ open: false, message: '', severity: 'info' });

  const showCallToast = (message, severity = 'info') => {
    setCallToast({ open: true, message, severity });
  };

  const handleToastClose = (_, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setCallToast((prev) => ({ ...prev, open: false }));
  };

  useEffect(() => {
    let isMounted = true;
    let unsubscribeConfig = null;

    const applyConfig = (config) => {
      if (!isMounted || !webrtcService) {
        return;
      }

      if (config?.turn?.username && config?.turn?.credential) {
        webrtcService.configureTurnServer(config.turn);
      }
    };

    const initializeApp = async () => {
      tokenManager.clearToken();
      localStorage.removeItem('student-app-cache');

      // Failsafe: If initialization takes more than 20 seconds, force continue
      const failsafeTimeout = setTimeout(() => {
        console.warn('⏰ Initialization timeout - forcing continue to login screen');
        if (isMounted) {
          setInitStatus('Timeout - continuing anyway');
          setConfigReady(true);
          setLoading(false);
        }
      }, 20000);

      try {
        setInitStatus('Loading config...');
        const config = await initializeAppConfig();
        if (!isMounted) {
          clearTimeout(failsafeTimeout);
          return;
        }

        setInitStatus('Config loaded ✓');
        applyConfig(config);
        unsubscribeConfig = onAppConfigChange(applyConfig);
      } catch (error) {
        console.error('❌ Failed to initialise app config:', error);
        if (isMounted) {
          setInitStatus('Config failed - using defaults');
          // Don't set appError, just continue with defaults
          console.log('Continuing with default config despite error');
        }
      } finally {
        if (isMounted) {
          setConfigReady(true);
          setInitStatus('Checking auth...');
          await verifyToken();
          clearTimeout(failsafeTimeout);
        }
      }
    };

    initializeApp();

    return () => {
      isMounted = false;
      if (unsubscribeConfig) {
        unsubscribeConfig();
      }
      disposeAppConfig();
    };
  }, [webrtcService]);

  // Initialize WebRTC service with socket connection
  useEffect(() => {
    const handleSocketConnected = (data) => {
      if (webrtcService && data.socket && data.userData) {
        webrtcService.initialize(data.socket, data.userData.userId);
        setupWebRTCEventHandlers();
      } else {
        console.error('❌ Student: Missing webrtcService or socket data:', {
          webrtcService: !!webrtcService,
          socket: !!data?.socket,
          userData: !!data?.userData
        });
      }
    };
    
    // Also check if socket is already connected when component mounts
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

  // Initialize call logging with WebRTC events
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

  const verifyToken = async () => {
    console.log('🔐 Starting token verification...');
    try {
      // Add timeout to prevent hanging on Firebase auth check
      const authCheckPromise = new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          unsubscribe(); // Clean up listener
          console.log('🔐 Firebase auth state:', firebaseUser ? 'signed in' : 'not signed in');

          if (firebaseUser) {
            try {
              setInitStatus('Loading user data...');
              // User is signed in, verify they're a student
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

                console.log('✅ Student user authenticated:', user.username);
                setUser(user);
                setIsAuthenticated(true);
                setInitStatus('Connecting to server...');

                // Connect to signaling server for WebRTC calls only
                const { socketUrl } = getAppConfig();
                const signalingUrl = socketUrl || SOCKET_URL;
                socketManager.connect(signalingUrl, {
                  userId: user.id,
                  username: user.username,
                  role: 'student'
                });

                // Set user online immediately and setup tracking
                UserService.setOnline();

                // Setup online status tracking after a small delay to ensure auth is complete
                setTimeout(() => {
                  UserService.setupOnlineStatusTracking();
                }, 1000);
              } else {
                console.warn('User not student or not found in database');
                await signOut(auth);
              }
            } catch (error) {
              console.error('Error verifying user role:', error);
              await signOut(auth);
            }
          } else {
            console.log('👤 No authenticated user - showing login screen');
          }

          setInitStatus('Ready!');
          setLoading(false);
          resolve();
        });
      });

      // Timeout after 10 seconds
      const timeoutPromise = new Promise((resolve) => {
        setTimeout(() => {
          console.warn('⏰ Auth check timeout - continuing to login screen');
          setInitStatus('Auth timeout - continuing');
          setLoading(false);
          resolve();
        }, 10000);
      });

      await Promise.race([authCheckPromise, timeoutPromise]);
    } catch (error) {
      console.error('❌ Token verification failed:', error);
      setInitStatus('Auth failed - showing login');
      setLoading(false);
    }
  };

  // WebRTC event handlers
  const setupWebRTCEventHandlers = () => {
    if (!webrtcService) {
      console.warn('❌ Student: WebRTC service not available for event handlers');
      return;
    }
    
    // Set up WebRTC event listeners
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
      
      // Log call start in Firebase
      const callStartTime = new Date();
      setCallStartTime(callStartTime);
      
      const callResult = await CallService.startCall(
        event.detail.teacherId || event.detail.callerId,
        event.detail.teacherName || event.detail.callerName || 'Teacher',
        'video'
      );
      
      if (callResult.success) {
        setCurrentCallId(callResult.callId);
      } else {
        console.error('Failed to log call start:', callResult.error);
      }
    });
    
    webrtcService.addEventListener('call-connected', () => {
      setMeetingStatus('connected');
    });
    
    webrtcService.addEventListener('call-answered', (event) => {
      setMeetingStatus('connecting');
      // Include the teacher's name from the incoming call
      const meetingData = {
        ...event.detail,
        teacherName: incomingCall?.callerName || 'Teacher'
      };
      setCurrentMeeting(meetingData);
      // Small delay to ensure WebRTC connection is establishing
      setTimeout(() => {
        setIsInMeeting(true);
      }, 500);
    });
    
    webrtcService.addEventListener('remote-stream', (event) => {
      // Remote stream will be handled by VideoCallWindow component
      // Update meeting status to indicate stream is available
      if (meetingStatus === 'connecting') {
        setMeetingStatus('connected');
      }
    });

    webrtcService.addEventListener('call-ended', () => {
      handleMeetingEnd('completed');
    });
    
    webrtcService.addEventListener('call-rejected', (event) => {
      const reason = event.detail?.reason;
      console.log('❌ Student: Call rejected', { reason, detail: event.detail });

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
      console.log('🔕 Student(mobile): Call answered on another device, closing incoming modal');
      setShowIncomingCall(false);
      setIncomingCall(null);
      showCallToast('Call answered on another device.', 'info');
      PushNotificationService.dismissLastInvite().catch((err) => {
        console.warn('⚠️ Failed to cancel local notification:', err);
      });
    });

    webrtcService.addEventListener('connection-failed', (event) => {
      console.warn('⚠️ Student: WebRTC reported connection failure, keeping call active for manual recovery', event?.detail);
    });
  };

  // Note: Socket.IO connection disabled - using Firebase real-time listeners instead
  // WebRTC will be initialized when needed for video calls

  const handleLogin = async (email, password) => {
    try {
      // First try Firebase authentication
      const firebaseUser = await signInWithEmailAndPassword(auth, email, password);

      // Get user data from Firestore
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.user.uid));
      
      if (!userDoc.exists()) {
        await signOut(auth);
        throw new Error('User not found in database');
      }

      const userData = userDoc.data();
      
      if (userData.role !== 'student') {
        await signOut(auth);
        throw new Error('Student access required. User role is: ' + userData.role);
      }

      const user = {
        id: firebaseUser.user.uid,
        email: firebaseUser.user.email,
        username: userData.username || firebaseUser.user.displayName,
        role: userData.role,
        ...userData
      };
      
      setUser(user);
      setIsAuthenticated(true);
      
      // Connect to signaling server for WebRTC calls only
      const { socketUrl } = getAppConfig();
      const signalingUrl = socketUrl || SOCKET_URL;
      socketManager.connect(signalingUrl, {
        userId: user.id,
        username: user.username,
        role: 'student'
      });
      
      // Set user online immediately and setup tracking
      UserService.setOnline();
      
      // Setup online status tracking after a small delay to ensure auth is complete
      setTimeout(() => {
        UserService.setupOnlineStatusTracking();
      }, 1000);
      
      // Save a token for compatibility with WebRTC service
      const idToken = await firebaseUser.user.getIdToken();
      tokenManager.saveToken(idToken);

      try {
        await PushNotificationService.initialize(user);
      } catch (pushError) {
        console.error('❌ Failed to initialise push notifications:', pushError);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Login failed';
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
        errorMessage = 'Invalid email or password';
      } else if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email format';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return { 
        success: false, 
        error: errorMessage
      };
    }
  };

  const handleLogout = async () => {
    // Clean up meeting state
    handleMeetingEnd();
    
    // Set user offline before logging out
    await UserService.setOffline();
    await PushNotificationService.clear();
    
    // Sign out from Firebase
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Firebase sign out error:', error);
    }
    
    tokenManager.clearToken();
    socketManager.disconnect(); // Disconnect from signaling server
    setUser(null);
    setIsAuthenticated(false);
  };
  
  // Meeting handling functions
  const handleAcceptCall = async () => {
    try {
      if (!webrtcService) {
        throw new Error('WebRTC service not initialized');
      }
      
      setShowIncomingCall(false);
      
      // Answer the call using WebRTC service
      await webrtcService.answerCall(incomingCall);
      
    } catch (error) {
      console.error('Failed to accept call:', error);
      alert('Failed to answer call: ' + error.message);
      handleMeetingEnd();
    }
  };
  
  const handleRejectCall = (options = {}) => {
    const reason = options.reason || 'user-rejected';
    console.log('❌ Student(mobile): Rejecting incoming call', { reason });

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
    
    // Log call end in Firebase
    if (currentCallId && callStartTime) {
      const endTime = new Date();
      const durationInSeconds = Math.round((endTime - callStartTime) / 1000);
      
      // End the call in Firebase
      const endResult = await CallService.endCall(currentCallId, endReason);
      if (endResult.success) {
        // Update duration
        await CallService.updateCallDuration(currentCallId, durationInSeconds);
      } else {
        console.error('Failed to log call end:', endResult.error);
      }
    }
    
    // End the WebRTC call
    if (webrtcService && webrtcService.getStatus().isInCall) {
      webrtcService.endCall();
    }
    
    // Reset all call state
    setIsInMeeting(false);
    setMeetingStatus('idle');
    setCurrentMeeting(null);
    setMeetingUrl(null);
    setShowIncomingCall(false);
    setIncomingCall(null);
    setIsRecording(false);
    setRecordingDuration(0);
    setCurrentCallId(null);
    setCallStartTime(null);
  };
  
  const handleShareMeetingLink = (url) => {
    // You could show a toast notification here
  };

  if (appError) {
    console.log('[StudentApp] Render branch', {
      configReady,
      loading,
      isAuthenticated,
      appError: appError?.message || String(appError)
    });
    return (
      <ThemeProvider theme={modernTheme}>
        <CssBaseline />
        <Box 
          display="flex" 
          flexDirection="column"
          justifyContent="center" 
          alignItems="center" 
          height="100vh"
          p={3}
        >
          <h2>App Error</h2>
          <p>Something went wrong. Please restart the app.</p>
          <p style={{fontSize: '12px', opacity: 0.7}}>{appError.toString()}</p>
          <button onClick={() => window.location.reload()}>Reload App</button>
        </Box>
      </ThemeProvider>
    );
  }

  if (!configReady || loading) {
    console.log('[StudentApp] Render branch - LOADING', { configReady, loading, isAuthenticated, appError, initStatus });
    return (
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        height="100vh"
        sx={{
          backgroundColor: '#667eea',
          color: 'white',
          padding: 3,
          textAlign: 'center',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 10000
        }}
      >
        <div style={{fontSize: '48px', marginBottom: '20px'}}>⏳</div>
        <div style={{fontSize: '20px', marginBottom: '15px', fontWeight: 'bold'}}>Loading Student App</div>
        <div style={{fontSize: '14px', marginBottom: '20px', opacity: 0.9}}>
          {initStatus}
        </div>
        <div style={{fontSize: '12px', opacity: 0.7, fontFamily: 'monospace'}}>
          Config: {configReady ? '✅ Ready' : '⏳ Loading'}<br/>
          Auth: {loading ? '⏳ Checking' : '✅ Ready'}<br/>
          Platform: {Capacitor.getPlatform()}
        </div>
        <button
          onClick={() => {
            console.log('🔄 Force reload triggered');
            window.location.reload();
          }}
          style={{
            marginTop: '30px',
            padding: '10px 20px',
            backgroundColor: 'rgba(255,255,255,0.2)',
            border: '1px solid white',
            borderRadius: '8px',
            color: 'white',
            fontSize: '14px',
            cursor: 'pointer'
          }}
        >
          Reload App
        </button>
      </Box>
    );
  }

  if (!isAuthenticated) {
    console.log('[StudentApp] Render branch - LOGIN SCREEN', { configReady, loading, isAuthenticated, appError });
    console.log('🔓 Showing login page now');
    return (
      <ThemeProvider theme={modernTheme}>
        <CssBaseline />
        <Box sx={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
          <Login onLogin={handleLogin} />
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={modernTheme}>
      <CssBaseline />
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
        
        {/* Incoming Call Modal */}
        <IncomingCallModal
          open={showIncomingCall}
          callerName={incomingCall?.callerName || 'Teacher'}
          callerInfo={incomingCall?.callerInfo}
          onAccept={handleAcceptCall}
          onReject={handleRejectCall}
        />
        
        {/* WebRTC Video Call Window */}
        {isInMeeting && (
          <ErrorBoundary>
            {/* Conditional rendering for mobile vs desktop video call */}
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
    </ThemeProvider>
  );
}

export default App;
