import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  IconButton,
  Typography,
  Avatar,
  Paper,
  Tooltip,
  Chip,
  useTheme,
  alpha,
  Button,
} from '@mui/material';
import {
  CallEnd as CallEndIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  Share as ShareIcon,
  Info as InfoIcon,
} from '@mui/icons-material';

function JitsiMeetingWindow({
  isOpen = false,
  meetingData,
  meetingStatus = 'connecting', // connecting, connected, ended
  isRecording = false,
  recordingDuration = 0,
  onEndMeeting,
  onShareLink
}) {
  const theme = useTheme();
  const meetingContainerRef = useRef(null);
  const jitsiContainerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [participantCount, setParticipantCount] = useState(1);

  // Prevent React from managing the Jitsi container DOM
  useLayoutEffect(() => {
    if (jitsiContainerRef.current) {
      // Mark this element to be ignored by React's reconciliation
      jitsiContainerRef.current._reactInternalFiber = null;
      jitsiContainerRef.current._reactInternalInstance = null;
      
    }
  }, [isOpen, meetingStatus]);

  // Handle fullscreen toggle
  const toggleFullscreen = () => {
    if (!isFullscreen) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
    setIsFullscreen(!isFullscreen);
  };

  // Copy meeting link to clipboard
  const handleShareLink = async () => {
    const meetingUrl = meetingData?.meetingUrl || `https://meet.jit.si/${meetingData?.roomName}`;
    if (meetingUrl) {
      try {
        await navigator.clipboard.writeText(meetingUrl);
        if (onShareLink) {
          onShareLink(meetingUrl);
        }
      } catch (error) {
        console.error('Failed to copy meeting link:', error);
      }
    }
  };

  // Format recording duration
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) {
    return null;
  }

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#000',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Meeting Header */}
      <Paper
        elevation={2}
        sx={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 3,
          backgroundColor: alpha(theme.palette.background.paper, 0.95),
          backdropFilter: 'blur(10px)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar
            sx={{
              width: 40,
              height: 40,
              backgroundColor: theme.palette.success.main,
            }}
          >
{(meetingData?.teacherName || 'Teacher').charAt(0)?.toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="h6" fontWeight={600}>
              Video Call with {meetingData?.teacherName || 'Teacher'}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                label={meetingStatus === 'connected' ? 'Connected' : 'Connecting...'}
                size="small"
                color={meetingStatus === 'connected' ? 'success' : 'warning'}
                sx={{ fontSize: '0.75rem' }}
              />
              {isRecording && (
                <Chip
                  label={`Recording ${formatDuration(recordingDuration)}`}
                  size="small"
                  color="error"
                  sx={{ fontSize: '0.75rem' }}
                />
              )}
              <Typography variant="caption" color="text.secondary">
                Room: {meetingData?.roomName}
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title="Share meeting link">
            <IconButton onClick={handleShareLink} color="primary">
              <ShareIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Meeting info">
            <IconButton color="primary">
              <InfoIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
            <IconButton onClick={toggleFullscreen} color="primary">
              {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
            </IconButton>
          </Tooltip>

          <Tooltip title="End meeting">
            <IconButton
              onClick={onEndMeeting}
              sx={{
                backgroundColor: theme.palette.error.main,
                color: 'white',
                ml: 2,
                '&:hover': {
                  backgroundColor: theme.palette.error.dark,
                },
              }}
            >
              <CallEndIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>

      {/* Meeting Container */}
      <Box
        ref={meetingContainerRef}
        sx={{
          flex: 1,
          position: 'relative',
          backgroundColor: '#1a1a2e',
        }}
      >
        {/* Jitsi Meeting Container */}
        <div 
          id="jitsi-meeting-container"
          ref={(el) => {
            jitsiContainerRef.current = el;
            if (el && meetingContainerRef.current !== el) {
              meetingContainerRef.current = el;
                element: !!el,
                dimensions: el ? {
                  width: el.offsetWidth,
                  height: el.offsetHeight,
                  visible: el.offsetParent !== null
                } : null
              });
              
              // Prevent React from managing this element's children
              if (el._reactInternalFiber) {
                el._reactInternalFiber.child = null;
              }
            }
          }}
          style={{
            width: '100%',
            height: '100%',
            position: 'absolute',
            top: 0,
            left: 0,
            overflow: 'hidden',
            backgroundColor: '#1a1a2e',
            zIndex: 0
          }}
        >
          {/* Loading state overlay */}
          {meetingStatus === 'connecting' && (
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                color: 'white',
                zIndex: 10,
                backgroundColor: 'rgba(0,0,0,0.8)',
                padding: 3,
                borderRadius: 2,
              }}
            >
              <Typography variant="h5" gutterBottom>
                Connecting to meeting...
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Please wait while we set up your video call
              </Typography>
              <Typography variant="caption" sx={{ mt: 2, display: 'block' }}>
                If you see a black screen, please allow camera/microphone access
              </Typography>
            </Box>
          )}
          
          {/* Connection status indicator (only shown during connecting) */}
          {meetingStatus === 'connected' && (
            <Box
              sx={{
                position: 'absolute',
                bottom: 20,
                right: 20,
                color: 'white',
                backgroundColor: 'rgba(0,150,0,0.8)',
                padding: 1,
                borderRadius: 1,
                fontSize: '0.8rem',
                zIndex: 5,
                opacity: 0.7,
                transition: 'opacity 0.3s'
              }}
            >
              Jitsi Meeting Active
            </Box>
          )}
        </div>
      </Box>

      {/* Meeting Footer (if needed) */}
      <Paper
        elevation={2}
        sx={{
          height: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: alpha(theme.palette.background.paper, 0.95),
          backdropFilter: 'blur(10px)',
        }}
      >
        <Typography variant="caption" color="text.secondary">
          Powered by Jitsi Meet • Secure end-to-end encrypted video calls
        </Typography>
      </Paper>
    </Box>
  );
}

export default JitsiMeetingWindow;