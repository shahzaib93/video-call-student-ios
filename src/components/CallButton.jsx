import React, { useState } from 'react';
import {
  IconButton,
  Button,
  Tooltip,
  CircularProgress,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Videocam as VideocamIcon,
  Phone as PhoneIcon,
  PhoneDisabled as PhoneDisabledIcon,
} from '@mui/icons-material';

function CallButton({
  recipientId,
  recipientName,
  recipientStatus = 'offline', // online, offline, busy
  onStartCall,
  disabled = false,
  variant = 'icon', // 'icon' or 'button'
  size = 'medium',
  showLabel = false,
  isCallInProgress = false
}) {
  const theme = useTheme();
  const [isLoading, setIsLoading] = useState(false);

  // Determine if call can be initiated
  const canCall = recipientStatus === 'online' && !disabled && !isCallInProgress;

  const handleCall = async () => {
    if (!canCall || isLoading) return;

    setIsLoading(true);
    
    try {
      await onStartCall(recipientId, recipientName);
    } catch (error) {
      console.error('Failed to start call:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get button color based on status
  const getButtonColor = () => {
    if (isCallInProgress) return theme.palette.warning.main;
    if (!canCall) return theme.palette.grey[400];
    return theme.palette.success.main;
  };

  // Get tooltip text
  const getTooltipText = () => {
    if (isCallInProgress) return 'Call in progress';
    if (recipientStatus === 'offline') return `${recipientName} is offline`;
    if (recipientStatus === 'busy') return `${recipientName} is busy`;
    if (disabled) return 'Call unavailable';
    return `Video call ${recipientName}`;
  };

  // Get icon based on state
  const getIcon = () => {
    if (isLoading) return <CircularProgress size={20} color="inherit" />;
    if (isCallInProgress) return <PhoneIcon />;
    if (!canCall) return <PhoneDisabledIcon />;
    return <VideocamIcon />;
  };

  if (variant === 'button') {
    return (
      <Tooltip title={getTooltipText()}>
        <span>
          <Button
            variant="contained"
            size={size}
            onClick={handleCall}
            disabled={!canCall || isLoading}
            startIcon={getIcon()}
            sx={{
              backgroundColor: getButtonColor(),
              color: 'white',
              '&:hover': {
                backgroundColor: canCall ? alpha(theme.palette.success.main, 0.8) : getButtonColor(),
              },
              '&:disabled': {
                backgroundColor: theme.palette.grey[300],
                color: theme.palette.grey[500],
              },
            }}
          >
            {showLabel && (
              isCallInProgress ? 'In Call' :
              recipientStatus === 'offline' ? 'Offline' :
              recipientStatus === 'busy' ? 'Busy' :
              'Call'
            )}
          </Button>
        </span>
      </Tooltip>
    );
  }

  return (
    <Tooltip title={getTooltipText()}>
      <span>
        <IconButton
          onClick={handleCall}
          disabled={!canCall || isLoading}
          size={size}
          sx={{
            backgroundColor: alpha(getButtonColor(), 0.1),
            color: getButtonColor(),
            border: `1px solid ${alpha(getButtonColor(), 0.3)}`,
            '&:hover': {
              backgroundColor: canCall ? alpha(theme.palette.success.main, 0.2) : alpha(getButtonColor(), 0.1),
              transform: canCall ? 'scale(1.05)' : 'none',
            },
            '&:disabled': {
              backgroundColor: alpha(theme.palette.grey[400], 0.1),
              color: theme.palette.grey[400],
              border: `1px solid ${alpha(theme.palette.grey[400], 0.3)}`,
            },
            transition: 'all 0.2s ease-in-out',
          }}
        >
          {getIcon()}
        </IconButton>
      </span>
    </Tooltip>
  );
}

export default CallButton;