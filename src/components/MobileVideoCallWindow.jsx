import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  IconButton,
  Typography,
  Drawer,
  Fab,
  useTheme,
  useMediaQuery,
  alpha,
  Slide,
  Badge,
  Paper,
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
  Menu as MenuIcon,
  Close as CloseIcon,
  ScreenRotation as ScreenRotationIcon,
} from '@mui/icons-material';

function MobileVideoCallWindow({ 
  isOpen = false, 
  callData, 
  callStatus = 'connecting', 
  onEndCall,
  webrtcService,
  socketManager 
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [showControlDrawer, setShowControlDrawer] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [remoteVolume, setRemoteVolume] = useState(0.7);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [remoteVideoAspectRatio, setRemoteVideoAspectRatio] = useState(16 / 9);
  const [isRemotePortrait, setIsRemotePortrait] = useState(false);
  const [isRemoteRotated, setIsRemoteRotated] = useState(false);
  const [viewportSize, setViewportSize] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  }));

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const updateViewport = () => {
      setViewportSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    updateViewport();

    window.addEventListener('resize', updateViewport);
    window.addEventListener('orientationchange', updateViewport);

    return () => {
      window.removeEventListener('resize', updateViewport);
      window.removeEventListener('orientationchange', updateViewport);
    };
  }, []);

  const displayIsPortrait = useMemo(() => {
    if (!remoteVideoAspectRatio) {
      return isRemoteRotated ? !isRemotePortrait : isRemotePortrait;
    }

    const effectiveAspectRatio = isRemoteRotated
      ? 1 / remoteVideoAspectRatio
      : remoteVideoAspectRatio;

    return effectiveAspectRatio < 1;
  }, [isRemotePortrait, remoteVideoAspectRatio, isRemoteRotated]);

  const displayAspectRatio = useMemo(() => {
    if (!remoteVideoAspectRatio) {
      return undefined;
    }
    if (isRemoteRotated) {
      return remoteVideoAspectRatio === 0 ? undefined : 1 / remoteVideoAspectRatio;
    }
    return remoteVideoAspectRatio;
  }, [remoteVideoAspectRatio, isRemoteRotated]);

  const rotatedVideoDimensions = useMemo(() => {
    if (!isRemoteRotated || !remoteVideoAspectRatio) {
      return null;
    }

    const ratio = remoteVideoAspectRatio;
    const viewportWidth = viewportSize.width || 0;
    const viewportHeight = viewportSize.height || 0;

    if (!viewportWidth || !viewportHeight) {
      return null;
    }

    let displayWidth = viewportHeight * 1.34;
    let displayHeight = displayWidth / ratio;

    const maxDisplayWidth = viewportWidth * 1.75;
    if (displayWidth > maxDisplayWidth) {
      displayWidth = maxDisplayWidth;
      displayHeight = displayWidth / ratio;
    }

    const maxDisplayHeight = viewportWidth * 1.65;
    if (displayHeight > maxDisplayHeight) {
      displayHeight = maxDisplayHeight;
      displayWidth = displayHeight * ratio;
    }

    return {
      displayWidth,
      displayHeight,
    };
  }, [isRemoteRotated, remoteVideoAspectRatio, viewportSize]);

  const remoteVideoWrapperStyles = useMemo(() => {
    const aspect = displayAspectRatio || (displayIsPortrait ? 9 / 16 : 16 / 9);

    if (isRemoteRotated && rotatedVideoDimensions) {
      return {
        position: 'relative',
        width: `${rotatedVideoDimensions.displayHeight}px`,
        height: `${rotatedVideoDimensions.displayWidth}px`,
        margin: '0 auto',
        backgroundColor: '#000',
        borderRadius: { xs: 0, sm: 2 },
        overflow: 'hidden',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        transition: 'all 0.3s ease',
      };
    }

    if (displayIsPortrait) {
      return {
        position: 'relative',
        width: { xs: '88%', sm: '70%' },
        maxWidth: 460,
        maxHeight: '85vh',
        aspectRatio: aspect || 9 / 16,
        borderRadius: 3,
        overflow: 'hidden',
        backgroundColor: '#000',
        boxShadow: '0 12px 28px rgba(0, 0, 0, 0.45)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        transition: 'all 0.3s ease'
      };
    }

    return {
      position: 'relative',
      width: '100%',
      maxWidth: '100vw',
      aspectRatio: aspect || 16 / 9,
      height: 'auto',
      maxHeight: '90vh',
      margin: '0 auto',
      backgroundColor: '#000',
      borderRadius: { xs: 0, sm: 2 },
      overflow: 'hidden',
      transition: 'all 0.3s ease'
    };
  }, [displayIsPortrait, displayAspectRatio, isRemoteRotated, rotatedVideoDimensions]);

  const updateRemoteVideoLayout = useCallback(() => {
    try {
      const video = remoteVideoRef.current;
      const track = remoteStream?.getVideoTracks?.()[0];

      let width = track?.getSettings?.().width;
      let height = track?.getSettings?.().height;

      if ((!width || !height) && video) {
        width = video.videoWidth;
        height = video.videoHeight;
      }

      if (width && height) {
        const ratio = width / height;
        setRemoteVideoAspectRatio(ratio || (16 / 9));
        setIsRemotePortrait(ratio < 1);
      }
    } catch (error) {
      console.warn('⚠️ Student Mobile: Failed to derive remote video layout', error);
    }
  }, [remoteStream]);

  // Initialize streams using the same approach as desktop VideoCallWindow
  useEffect(() => {
    
    if (!webrtcService) {
      return;
    }

    // CRITICAL: Check WebRTC service status first (same as desktop VideoCallWindow)
    const status = webrtcService.getStatus();
    
    // Set local stream if available in WebRTC service
    if (status.hasLocalStream && webrtcService.localStream) {
      setLocalStream(webrtcService.localStream);
    }
    // Fall back to callData.localStream
    else if (callData?.localStream) {
      setLocalStream(callData.localStream);
    }
    else {
    }

    // Set remote stream if available in WebRTC service
    if (status.hasRemoteStream && webrtcService.remoteStream) {
      setRemoteStream(webrtcService.remoteStream);
    }
    else {
    }
  }, [webrtcService, callData]);

  // Also watch for changes in webrtcService.localStream
  useEffect(() => {
    if (!webrtcService || localStream) return; // Skip if already have a stream
    
    const checkInterval = setInterval(() => {
      if (webrtcService.localStream && !localStream) {
        setLocalStream(webrtcService.localStream);
      }
    }, 500);
    
    // Clean up after 5 seconds
    const timeout = setTimeout(() => clearInterval(checkInterval), 5000);
    
    return () => {
      clearInterval(checkInterval);
      clearTimeout(timeout);
    };
  }, [webrtcService, localStream]);

  // Set up local video stream
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
      
      // Ensure local video plays
      localVideoRef.current.addEventListener('loadedmetadata', async () => {
        try {
          await localVideoRef.current.play();
        } catch (error) {
          console.warn('🎥 Student Mobile: Local video autoplay failed:', error);
        }
      });
    }
  }, [localStream]);

  // Set up remote video stream
  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
      // Set initial volume to prevent audio feedback/beeping
      remoteVideoRef.current.volume = remoteVolume;
      
      // Ensure proper audio playback settings
      remoteVideoRef.current.addEventListener('loadedmetadata', async () => {
        
        // Ensure video plays on mobile
        try {
          // Add user interaction requirement for mobile autoplay
          remoteVideoRef.current.muted = false;
          remoteVideoRef.current.autoplay = true;
          remoteVideoRef.current.playsInline = true;
          
          await remoteVideoRef.current.play();
        } catch (error) {
          console.warn('🎥 Student Mobile: Remote video autoplay failed, will try to play when user interacts:', error);
          
          // Add click handler to start video on user interaction
          const playOnInteraction = async () => {
            try {
              await remoteVideoRef.current.play();
              document.removeEventListener('click', playOnInteraction);
            } catch (err) {
              console.error('🎥 Student Mobile: Failed to play remote video even after interaction:', err);
            }
          };
          document.addEventListener('click', playOnInteraction, { once: true });
        }
      });
    }
  }, [remoteStream, remoteVolume]);

  useEffect(() => {
    updateRemoteVideoLayout();

    const videoEl = remoteVideoRef.current;
    const track = remoteStream?.getVideoTracks?.()[0];

    const handleMetadata = () => updateRemoteVideoLayout();

    if (videoEl) {
      videoEl.addEventListener('loadedmetadata', handleMetadata);
    }

    if (track) {
      track.onresize = handleMetadata;
    }

    return () => {
      if (videoEl) {
        videoEl.removeEventListener('loadedmetadata', handleMetadata);
      }
      if (track) {
        track.onresize = null;
      }
    };
  }, [remoteStream, updateRemoteVideoLayout]);

  // Listen for remote stream from WebRTC service (same as desktop VideoCallWindow)
  useEffect(() => {
    if (!webrtcService) {
      return;
    }

    const handleRemoteStream = (event) => {
      setRemoteStream(event.detail.stream);
    };

    webrtcService.addEventListener('remote-stream', handleRemoteStream);
    
    return () => {
      webrtcService.removeEventListener('remote-stream', handleRemoteStream);
    };
  }, [webrtcService]);

  // Handle audio/video controls with WebRTC service
  const handleToggleAudio = () => {
    if (webrtcService) {
      const newState = webrtcService.toggleAudio();
      setIsAudioEnabled(newState);
    }
  };

  const handleToggleVideo = async () => {
    if (!webrtcService) {
      return;
    }

    try {
      const newState = await webrtcService.toggleVideo();
      setIsVideoEnabled(newState);
      if (webrtcService.localStream) {
        setLocalStream(webrtcService.localStream);
      }
    } catch (error) {
      console.error('❌ Student Mobile: Failed to toggle video:', error);
    }
  };

  // Update remote video volume
  useEffect(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.volume = remoteVolume;
    }
  }, [remoteVolume]);

  // Mobile-first control button styling
  const controlButtonStyle = {
    backgroundColor: alpha(theme.palette.background.paper, 0.9),
    backdropFilter: 'blur(10px)',
    color: theme.palette.primary.main,
    border: `2px solid ${alpha(theme.palette.primary.main, 0.3)}`,
    boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
    transition: 'all 0.3s ease',
    width: isMobile ? 48 : 56,
    height: isMobile ? 48 : 56,
    '&:hover': {
      transform: 'translateY(-2px)',
      backgroundColor: theme.palette.primary.main,
      color: 'white',
      boxShadow: `0 6px 16px ${alpha(theme.palette.primary.main, 0.4)}`,
    },
  };

  const activeButtonStyle = {
    ...controlButtonStyle,
    backgroundColor: theme.palette.primary.main,
    color: 'white',
    '&:hover': {
      backgroundColor: theme.palette.primary.dark,
      color: 'white',
    },
  };

  const endCallButtonStyle = {
    backgroundColor: '#f44336',
    color: 'white',
    border: '2px solid #f44336',
    boxShadow: '0 4px 12px rgba(244, 67, 54, 0.3)',
    transition: 'all 0.3s ease',
    width: isMobile ? 56 : 64,
    height: isMobile ? 56 : 64,
    '&:hover': {
      transform: 'translateY(-2px)',
      backgroundColor: '#d32f2f',
      boxShadow: '0 6px 16px rgba(244, 67, 54, 0.4)',
    },
  };

  // Primary controls (always visible)
  const primaryControls = [
    {
      icon: isAudioEnabled ? <MicIcon /> : <MicOffIcon />,
      onClick: handleToggleAudio,
      active: isAudioEnabled,
      color: isAudioEnabled ? 'primary' : 'error'
    },
    {
      icon: isVideoEnabled ? <VideocamIcon /> : <VideocamOffIcon />,
      onClick: handleToggleVideo,
      active: isVideoEnabled,
      color: isVideoEnabled ? 'primary' : 'error'
    },
    {
      icon: <CallEndIcon />,
      onClick: onEndCall,
      style: endCallButtonStyle
    }
  ];

  // Secondary controls (in drawer for mobile)
  const secondaryControls = [
    {
      icon: isScreenSharing ? <StopScreenShareIcon /> : <ScreenShareIcon />,
      onClick: () => setIsScreenSharing(!isScreenSharing),
      active: isScreenSharing,
      label: 'Screen Share'
    },
    {
      icon: <WhiteboardIcon />,
      onClick: () => setShowWhiteboard(!showWhiteboard),
      active: showWhiteboard,
      label: 'Whiteboard'
    },
    {
      icon: <VolumeDownIcon />,
      onClick: () => setRemoteVolume(Math.max(0, remoteVolume - 0.1)),
      label: 'Volume Down'
    },
    {
      icon: <VolumeUpIcon />,
      onClick: () => setRemoteVolume(Math.min(1, remoteVolume + 0.1)),
      label: 'Volume Up'
    },
    {
      icon: <ChatIcon />,
      onClick: () => setShowChat(!showChat),
      active: showChat,
      label: 'Chat'
    },
    {
      icon: <RaiseHandIcon />,
      onClick: () => {},
      label: 'Raise Hand'
    }
  ];

  if (!isOpen) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#000',
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Video Container - Responsive */}
      <Box
        sx={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
        }}
      >
        {/* Remote Video - Main */}
        <Box
          sx={{
            flex: 1,
            backgroundColor: '#1a1a1a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            padding: displayIsPortrait && !isRemoteRotated ? { xs: 2, sm: 3 } : 0,
          }}
        >
          <Box sx={remoteVideoWrapperStyles}>
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              style={{
                position: isRemoteRotated ? 'absolute' : 'static',
                top: isRemoteRotated ? '50%' : undefined,
                left: isRemoteRotated ? '50%' : undefined,
                width: isRemoteRotated && rotatedVideoDimensions
                  ? `${rotatedVideoDimensions.displayWidth}px`
                  : '100%',
                height: isRemoteRotated && rotatedVideoDimensions
                  ? `${rotatedVideoDimensions.displayHeight}px`
                  : '100%',
                objectFit: 'contain',
                backgroundColor: '#000',
                display: 'block',
                transform: isRemoteRotated ? 'translate(-50%, -50%) rotate(90deg)' : 'none',
                transformOrigin: 'center center',
              }}
            />
          </Box>

          {!remoteStream && (
            <Box
              sx={{
                position: 'absolute',
                color: 'white',
                textAlign: 'center',
              }}
            >
              <Typography variant="h6">
                {callStatus === 'connecting' ? 'Calling teacher...' : 'Waiting for video'}
              </Typography>
              <Typography variant="body2" color="grey.400">
                {callStatus === 'connecting' ? 'Preparing connection' : 'Attempting to receive stream'}
              </Typography>
            </Box>
          )}

          {/* Call Status Overlay */}
          <Box
            sx={{
              position: 'absolute',
              top: 20,
              left: 20,
              right: 20,
              zIndex: 1,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <Paper
              sx={{
                px: 2,
                py: 1,
                backgroundColor: alpha(theme.palette.background.paper, 0.9),
                backdropFilter: 'blur(10px)',
              }}
            >
              <Typography variant="body2" color="textSecondary">
                {callStatus === 'connecting' && '📞 Connecting...'}
                {callStatus === 'connected' && '🟢 Connected'}
                {callStatus === 'ended' && '📞 Call Ended'}
                {!localStream && ' (No local stream)'}
                {!remoteStream && ' (No remote stream)'}
                {localStream && remoteStream && ' (Both streams ready)'}
              </Typography>
            </Paper>
            
            {/* Teacher Info */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Paper
                sx={{
                  px: 2,
                  py: 1,
                  backgroundColor: alpha(theme.palette.background.paper, 0.9),
                  backdropFilter: 'blur(10px)',
                }}
              >
                <Typography variant="body2" fontWeight={600}>
                  {callData?.teacherName || 'Teacher'}
                </Typography>
              </Paper>
              <IconButton
                size="small"
                onClick={() => setIsRemoteRotated((prev) => !prev)}
                sx={{
                  backgroundColor: isRemoteRotated
                    ? theme.palette.primary.main
                    : alpha(theme.palette.background.paper, 0.9),
                  color: isRemoteRotated ? '#fff' : theme.palette.primary.main,
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.4)}`,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    backgroundColor: theme.palette.primary.main,
                    color: '#fff',
                  },
                }}
              >
                <ScreenRotationIcon fontSize="inherit" />
              </IconButton>
            </Box>
          </Box>
        </Box>

        {/* Local Video - Picture in Picture */}
        <Box
          sx={{
            position: 'absolute',
            bottom: isMobile ? 100 : 20,
            right: 20,
            width: isMobile ? 120 : 200,
            height: isMobile ? 160 : 150,
            backgroundColor: '#2a2a2a',
            borderRadius: 2,
            overflow: 'hidden',
            border: `2px solid ${alpha(theme.palette.primary.main, 0.5)}`,
            zIndex: 2,
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
        </Box>
      </Box>

      {/* Mobile Controls Bar */}
      <Box
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: alpha(theme.palette.background.paper, 0.95),
          backdropFilter: 'blur(20px)',
          borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          p: 2,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 2,
          zIndex: 3,
          // Responsive padding for different screen sizes
          px: isSmallMobile ? 1 : 2,
          py: isSmallMobile ? 1.5 : 2,
        }}
      >
        {/* More Options Button - Mobile Only */}
        {isMobile && (
          <Fab
            size="medium"
            onClick={() => setShowControlDrawer(true)}
            sx={{
              ...controlButtonStyle,
              mr: 1,
            }}
          >
            <MenuIcon />
          </Fab>
        )}

        {/* Primary Controls */}
        {primaryControls.map((control, index) => (
          <IconButton
            key={index}
            onClick={control.onClick}
            sx={control.style || (control.active ? activeButtonStyle : controlButtonStyle)}
          >
            {control.icon}
          </IconButton>
        ))}
      </Box>

      {/* Controls Drawer - Mobile */}
      <Drawer
        anchor="left"
        open={showControlDrawer}
        onClose={() => setShowControlDrawer(false)}
        PaperProps={{
          sx: {
            width: 280,
            backgroundColor: alpha(theme.palette.background.paper, 0.95),
            backdropFilter: 'blur(20px)',
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          },
        }}
      >
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" color="primary">
              Call Controls
            </Typography>
            <IconButton onClick={() => setShowControlDrawer(false)}>
              <CloseIcon />
            </IconButton>
          </Box>

          {/* Secondary Controls */}
          {secondaryControls.map((control, index) => (
            <Box
              key={index}
              sx={{
                display: 'flex',
                alignItems: 'center',
                mb: 2,
                p: 1,
                borderRadius: 1,
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                },
              }}
            >
              <IconButton
                onClick={control.onClick}
                sx={control.active ? activeButtonStyle : controlButtonStyle}
              >
                {control.icon}
              </IconButton>
              <Typography variant="body1" sx={{ ml: 2, flex: 1 }}>
                {control.label}
              </Typography>
            </Box>
          ))}
        </Box>
      </Drawer>

      {/* Chat Sidebar - Slide in from right */}
      <Slide direction="left" in={showChat} mountOnEnter unmountOnExit>
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            right: 0,
            width: isMobile ? '100%' : 380,
            height: '100%',
            backgroundColor: alpha(theme.palette.background.paper, 0.95),
            backdropFilter: 'blur(20px)',
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            zIndex: 10001,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Chat Header */}
          <Box
            sx={{
              p: 2,
              backgroundColor: alpha(theme.palette.primary.main, 0.1),
              borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Typography variant="h6" color="primary">
              Chat
            </Typography>
            <IconButton onClick={() => setShowChat(false)}>
              <CloseIcon />
            </IconButton>
          </Box>

          {/* Chat Content */}
          <Box sx={{ flex: 1, p: 2 }}>
            <Typography variant="body2" color="textSecondary">
              Chat feature coming soon...
            </Typography>
          </Box>
        </Box>
      </Slide>
    </Box>
  );
}

export default MobileVideoCallWindow;
