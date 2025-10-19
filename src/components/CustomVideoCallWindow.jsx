import React, { useState, useEffect, useRef } from 'react';
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
  Mic as MicIcon,
  MicOff as MicOffIcon,
  Videocam as VideocamIcon,
  VideocamOff as VideocamOffIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  Share as ShareIcon,
  Info as InfoIcon,
} from '@mui/icons-material';

function CustomVideoCallWindow({
  isOpen = false,
  meetingData,
  meetingStatus = 'connecting',
  isRecording = false,
  recordingDuration = 0,
  onEndMeeting,
  onShareLink,
  jitsiService
}) {
  const theme = useTheme();
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [participantCount, setParticipantCount] = useState(1);

  // Handle Jitsi service events
  useEffect(() => {
    if (!jitsiService) return;

    const handleAudioMuted = (muted) => setIsAudioMuted(muted);
    const handleVideoMuted = (muted) => setIsVideoMuted(muted);
    const handleParticipantJoined = () => setParticipantCount(prev => prev + 1);
    const handleParticipantLeft = () => setParticipantCount(prev => Math.max(1, prev - 1));

    jitsiService.on('audio-muted', handleAudioMuted);
    jitsiService.on('video-muted', handleVideoMuted);
    jitsiService.on('participant-joined', handleParticipantJoined);
    jitsiService.on('participant-left', handleParticipantLeft);

    return () => {
      jitsiService.off('audio-muted', handleAudioMuted);
      jitsiService.off('video-muted', handleVideoMuted);
      jitsiService.off('participant-joined', handleParticipantJoined);
      jitsiService.off('participant-left', handleParticipantLeft);
    };
  }, [jitsiService]);

  // Control handlers
  const toggleAudio = () => {
    if (jitsiService) {
      jitsiService.toggleAudio();
    }
  };

  const toggleVideo = () => {
    if (jitsiService) {
      jitsiService.toggleVideo();
    }
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
    setIsFullscreen(!isFullscreen);
  };

  const handleShareLink = async () => {
    const meetingUrl = meetingData?.meetingUrl || `https://meet.ffmuc.net/${meetingData?.roomName}`;
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
            {(meetingData?.teacherName || meetingData?.studentName || 'P').charAt(0)?.toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="h6" fontWeight={600}>
              Video Call with {meetingData?.teacherName || meetingData?.studentName || 'Participant'}
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
        </Box>
      </Paper>

      {/* Video Container */}
      <Box sx={{ flex: 1, display: 'flex', position: 'relative' }}>
        {/* Remote Video (Main) */}
        <Box
          sx={{
            flex: 1,
            backgroundColor: '#1a1a2e',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            muted={false}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              backgroundColor: '#1a1a2e',
            }}
          />
          
          {/* Remote participant info */}
          <Box
            sx={{
              position: 'absolute',
              bottom: 16,
              left: 16,
              backgroundColor: 'rgba(0,0,0,0.7)',
              color: 'white',
              padding: '4px 8px',
              borderRadius: 1,
              fontSize: '0.875rem',
            }}
          >
            {meetingData?.teacherName || meetingData?.studentName || 'Participant'}
          </Box>

          {/* Connection status overlay */}
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
              }}
            >
              <Typography variant="h5" gutterBottom>
                Connecting to {meetingData?.teacherName || meetingData?.studentName || 'Participant'}...
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Please wait while we establish the connection
              </Typography>
            </Box>
          )}
        </Box>

        {/* Local Video (Picture-in-Picture) */}
        <Box
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            width: 240,
            height: 180,
            backgroundColor: '#333',
            borderRadius: 2,
            overflow: 'hidden',
            border: '2px solid',
            borderColor: theme.palette.primary.main,
            zIndex: 5,
          }}
        >
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted={true}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: 'scaleX(-1)', // Mirror local video
            }}
          />
          
          {/* Local participant info */}
          <Box
            sx={{
              position: 'absolute',
              bottom: 4,
              left: 4,
              backgroundColor: 'rgba(0,0,0,0.7)',
              color: 'white',
              padding: '2px 6px',
              borderRadius: 0.5,
              fontSize: '0.75rem',
            }}
          >
            You
          </Box>

          {/* Mute indicators on local video */}
          {(isAudioMuted || isVideoMuted) && (
            <Box
              sx={{
                position: 'absolute',
                top: 4,
                right: 4,
                display: 'flex',
                gap: 0.5,
              }}
            >
              {isAudioMuted && (
                <Box
                  sx={{
                    backgroundColor: 'rgba(255,0,0,0.8)',
                    borderRadius: '50%',
                    p: 0.5,
                  }}
                >
                  <MicOffIcon sx={{ fontSize: 16, color: 'white' }} />
                </Box>
              )}
              {isVideoMuted && (
                <Box
                  sx={{
                    backgroundColor: 'rgba(255,0,0,0.8)',
                    borderRadius: '50%',
                    p: 0.5,
                  }}
                >
                  <VideocamOffIcon sx={{ fontSize: 16, color: 'white' }} />
                </Box>
              )}
            </Box>
          )}
        </Box>
      </Box>

      {/* Control Bar */}
      <Paper
        elevation={3}
        sx={{
          height: 80,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: alpha(theme.palette.background.paper, 0.95),
          backdropFilter: 'blur(10px)',
          gap: 3,
        }}
      >
        {/* Audio Toggle */}
        <Tooltip title={isAudioMuted ? 'Unmute microphone' : 'Mute microphone'}>
          <IconButton
            onClick={toggleAudio}
            sx={{
              width: 56,
              height: 56,
              backgroundColor: isAudioMuted ? theme.palette.error.main : theme.palette.grey[700],
              color: 'white',
              '&:hover': {
                backgroundColor: isAudioMuted ? theme.palette.error.dark : theme.palette.grey[600],
              },
            }}
          >
            {isAudioMuted ? <MicOffIcon /> : <MicIcon />}
          </IconButton>
        </Tooltip>

        {/* Video Toggle */}
        <Tooltip title={isVideoMuted ? 'Turn on camera' : 'Turn off camera'}>
          <IconButton
            onClick={toggleVideo}
            sx={{
              width: 56,
              height: 56,
              backgroundColor: isVideoMuted ? theme.palette.error.main : theme.palette.grey[700],
              color: 'white',
              '&:hover': {
                backgroundColor: isVideoMuted ? theme.palette.error.dark : theme.palette.grey[600],
              },
            }}
          >
            {isVideoMuted ? <VideocamOffIcon /> : <VideocamIcon />}
          </IconButton>
        </Tooltip>

        {/* End Call */}
        <Tooltip title="End call">
          <IconButton
            onClick={onEndMeeting}
            sx={{
              width: 56,
              height: 56,
              backgroundColor: theme.palette.error.main,
              color: 'white',
              '&:hover': {
                backgroundColor: theme.palette.error.dark,
              },
            }}
          >
            <CallEndIcon />
          </IconButton>
        </Tooltip>
      </Paper>
    </Box>
  );
}

export default CustomVideoCallWindow;