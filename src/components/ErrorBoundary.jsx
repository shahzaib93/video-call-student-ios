import React from 'react';
import { Box, Typography, Button } from '@mui/material';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
    
    // Don't treat DOM cleanup errors as critical
    if (error.message?.includes('removeChild') || error.message?.includes('not a child of this node')) {
      console.warn('Non-critical DOM cleanup error, ignoring:', error.message);
      // Reset error state for these specific errors
      setTimeout(() => {
        this.setState({ hasError: false, error: null });
      }, 100);
      return;
    }
  }

  render() {
    if (this.state.hasError && !this.state.error?.message?.includes('removeChild')) {
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
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            textAlign: 'center',
            p: 3,
          }}
        >
          <Typography variant="h5" gutterBottom>
            Meeting Error
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 600 }}>
            Something went wrong with the meeting interface. Please try refreshing or rejoining.
          </Typography>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={() => window.location.reload()}
          >
            Refresh Page
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;