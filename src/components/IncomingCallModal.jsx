import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Avatar,
  Typography,
  IconButton,
  Paper,
  Fade,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Call as CallIcon,
  CallEnd as CallEndIcon,
  Videocam as VideocamIcon,
} from '@mui/icons-material';

function IncomingCallModal({
  open,
  callerName,
  callerInfo,
  onAccept,
  onReject,
  autoRejectTimer = 30 // Auto-reject after 30 seconds
}) {
  const theme = useTheme();
  const [timeLeft, setTimeLeft] = useState(autoRejectTimer);
  const [isRinging, setIsRinging] = useState(true);

  // Countdown timer for auto-reject
  useEffect(() => {
    if (!open) {
      setTimeLeft(autoRejectTimer);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          onReject?.({ reason: 'auto-timeout' }); // Auto-reject when timer reaches 0
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [open, autoRejectTimer, onReject]);

  // Ringing animation
  useEffect(() => {
    if (!open) return;

    const interval = setInterval(() => {
      setIsRinging(prev => !prev);
    }, 1000);

    return () => clearInterval(interval);
  }, [open]);

  // Play ringtone (if audio is available)
  useEffect(() => {
    let beepInterval = null;
    let audioContext = null;
    
    if (open) {
      
      // Create a simple beep sound using Web Audio API
      const initializeAudio = async () => {
        try {
          // Create AudioContext - this might need user interaction on mobile
          audioContext = new (window.AudioContext || window.webkitAudioContext)();
          
          // Resume AudioContext if it's suspended (common on mobile)
          if (audioContext.state === 'suspended') {
            await audioContext.resume();
          }
          
          const playBeep = () => {
            try {
              if (audioContext.state !== 'running') {
                console.warn('📞 Student: AudioContext not running, state:', audioContext.state);
                return;
              }
              
              const oscillator = audioContext.createOscillator();
              const gainNode = audioContext.createGain();
              
              oscillator.connect(gainNode);
              gainNode.connect(audioContext.destination);
              
              // Higher frequency for better mobile speaker output
              oscillator.frequency.setValueAtTime(1000, audioContext.currentTime);
              gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
              gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
              
              oscillator.start(audioContext.currentTime);
              oscillator.stop(audioContext.currentTime + 0.3);
              
            } catch (beepError) {
              console.warn('📞 Student: Failed to play individual beep:', beepError);
            }
          };

          // Play immediately and then every 1.5 seconds for mobile attention
          playBeep();
          beepInterval = setInterval(playBeep, 1500);
          
        } catch (error) {
          console.warn('📞 Student: Could not create audio context for ringtone:', error);
          console.warn('📞 Student: This is normal on some mobile browsers - ringtone will be visual only');
          
          // Fallback: Try to play system notification sound if available
          try {
            if ('vibrate' in navigator) {
              const vibratePattern = [200, 100, 200, 100, 200];
              const vibrateInterval = setInterval(() => {
                navigator.vibrate(vibratePattern);
              }, 2000);
              navigator.vibrate(vibratePattern); // Vibrate immediately
              
              // Store vibrate interval for cleanup
              beepInterval = vibrateInterval;
            }
          } catch (vibrateError) {
            console.warn('📞 Student: Vibration also not available:', vibrateError);
          }
        }
      };
      
      // Initialize audio with a slight delay to ensure modal is fully rendered
      setTimeout(initializeAudio, 100);

      return () => {
        if (beepInterval) {
          clearInterval(beepInterval);
        }
        if (audioContext && audioContext.state !== 'closed') {
          audioContext.close();
        }
      };
    }
  }, [open]);

  const handleAccept = () => {
    setTimeLeft(0);
    onAccept?.();
  };

  const handleReject = () => {
    setTimeLeft(0);
    onReject?.({ reason: 'user-declined' });
  };

  return (
    <Dialog
      open={open}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 4,
          backgroundColor: theme.palette.background.paper,
          backgroundImage: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
        }
      }}
    >
      <DialogContent sx={{ p: 4, textAlign: 'center' }}>
        {/* Incoming call header */}
        <Typography variant="h5" sx={{ mb: 1, fontWeight: 600 }}>
          Incoming Video Call
        </Typography>
        
        <Typography variant="body2" color="textSecondary" sx={{ mb: 4 }}>
          Your teacher is calling you
        </Typography>

        {/* Caller Avatar with Ringing Effect */}
        <Box
          sx={{
            position: 'relative',
            display: 'flex',
            justifyContent: 'center',
            mb: 3,
          }}
        >
          {/* Ripple Effect */}
          <Fade in={isRinging}>
            <Box
              sx={{
                position: 'absolute',
                width: 200,
                height: 200,
                borderRadius: '50%',
                border: `3px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                animation: 'ripple 2s infinite',
                '@keyframes ripple': {
                  '0%': {
                    transform: 'scale(0.8)',
                    opacity: 1,
                  },
                  '100%': {
                    transform: 'scale(1.2)',
                    opacity: 0,
                  },
                },
              }}
            />
          </Fade>

          <Avatar
            sx={{
              width: 120,
              height: 120,
              fontSize: '3rem',
              backgroundColor: theme.palette.primary.main,
              border: `4px solid ${theme.palette.background.paper}`,
              boxShadow: theme.shadows[8],
            }}
          >
            {callerName?.charAt(0)?.toUpperCase()}
          </Avatar>

          {/* Video call icon */}
          <Box
            sx={{
              position: 'absolute',
              bottom: 0,
              right: 'calc(50% - 80px)',
              backgroundColor: theme.palette.success.main,
              borderRadius: '50%',
              p: 1,
              border: `3px solid ${theme.palette.background.paper}`,
            }}
          >
            <VideocamIcon sx={{ color: 'white', fontSize: 20 }} />
          </Box>
        </Box>

        {/* Caller Information */}
        <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
          {callerName}
        </Typography>
        
        {callerInfo && (
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            {callerInfo}
          </Typography>
        )}

        {/* Timer */}
        <Paper
          elevation={0}
          sx={{
            backgroundColor: alpha(theme.palette.warning.main, 0.1),
            color: theme.palette.warning.main,
            py: 1,
            px: 2,
            borderRadius: 2,
            mb: 4,
            display: 'inline-block',
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            Auto-reject in {timeLeft}s
          </Typography>
        </Paper>

        {/* Action Buttons */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
            mt: 4,
          }}
        >
          {/* Reject Button */}
          <IconButton
            onClick={handleReject}
            sx={{
              backgroundColor: theme.palette.error.main,
              color: 'white',
              width: 80,
              height: 80,
              '&:hover': {
                backgroundColor: theme.palette.error.dark,
                transform: 'scale(1.1)',
              },
              transition: 'all 0.2s ease-in-out',
            }}
          >
            <CallEndIcon sx={{ fontSize: 32 }} />
          </IconButton>

          {/* Accept Button */}
          <IconButton
            onClick={handleAccept}
            sx={{
              backgroundColor: theme.palette.success.main,
              color: 'white',
              width: 80,
              height: 80,
              animation: 'pulse 2s infinite',
              '&:hover': {
                backgroundColor: theme.palette.success.dark,
                transform: 'scale(1.1)',
              },
              transition: 'all 0.2s ease-in-out',
              '@keyframes pulse': {
                '0%': {
                  boxShadow: `0 0 0 0 ${alpha(theme.palette.success.main, 0.7)}`,
                },
                '70%': {
                  boxShadow: `0 0 0 20px ${alpha(theme.palette.success.main, 0)}`,
                },
                '100%': {
                  boxShadow: `0 0 0 0 ${alpha(theme.palette.success.main, 0)}`,
                },
              },
            }}
          >
            <CallIcon sx={{ fontSize: 32 }} />
          </IconButton>
        </Box>

        {/* Button Labels */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-around',
            mt: 2,
          }}
        >
          <Typography variant="caption" color="error">
            Decline
          </Typography>
          <Typography variant="caption" color="success.main">
            Accept
          </Typography>
        </Box>

        {/* Recording Notice */}
        <Paper
          elevation={0}
          sx={{
            backgroundColor: alpha(theme.palette.info.main, 0.1),
            color: theme.palette.info.main,
            p: 2,
            borderRadius: 2,
            mt: 3,
          }}
        >
          <Typography variant="caption">
            📹 This call will be automatically recorded for educational purposes
          </Typography>
        </Paper>
      </DialogContent>
    </Dialog>
  );
}

export default IncomingCallModal;
