import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Email as EmailIcon,
  Lock as LockIcon,
} from '@mui/icons-material';

function Login({ onLogin }) {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await onLogin(formData.email, formData.password);
      if (!result.success) {
        setError(result.error || 'Login failed');
      }
    } catch (error) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <Box 
      sx={{ 
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      {/* Hero Section */}
      <Box 
        sx={{
          flex: '1 1 auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          px: 3,
          py: 6,
          minHeight: { xs: '40vh', sm: '50vh' },
        }}
      >
        <Box 
          component="img" 
          src="/Tarteele-Quran-Logo-only.JPG" 
          alt="Tarteel-e-Quran Logo"
          sx={{
            width: { xs: 120, sm: 150 },
            height: { xs: 120, sm: 150 },
            objectFit: 'contain',
            margin: '0 auto',
            mb: 3,
            display: 'block',
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(255, 255, 255, 0.2)',
          }}
        />
        <Typography variant="h3" gutterBottom sx={{ fontWeight: 700, color: '#FFFFFF', mb: 1 }}>
          Tarteel-e-Quran
        </Typography>
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 500, color: 'rgba(255, 255, 255, 0.9)', mb: 2 }}>
          Student Portal
        </Typography>
        <Typography variant="h6" sx={{ color: 'rgba(255, 255, 255, 0.8)', fontWeight: 300 }}>
          Welcome! Sign in to access your classes
        </Typography>
      </Box>

      {/* Login Form Section */}
      <Box 
        sx={{
          backgroundColor: '#FFFFFF',
          borderRadius: { xs: 0, sm: '28px 28px 0 0' },
          px: { xs: 3, sm: 4 },
          py: { xs: 4, sm: 5 },
          boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.1)',
          minHeight: { xs: '60vh', sm: 'auto' },
        }}
      >
        {error && (
          <Alert severity="error" sx={{ mb: 3, width: '100%' }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} sx={{ maxWidth: 400, mx: 'auto', width: '100%' }}>
        <TextField
          fullWidth
          label="Email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          margin="normal"
          required
          autoFocus
          sx={{ 
            mb: 2,
            '& .MuiOutlinedInput-root': {
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              '& fieldset': {
                borderColor: '#E0E0E0',
                borderWidth: '2px',
              },
              '&:hover fieldset': {
                borderColor: '#76a6f6',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#76a6f6',
                borderWidth: '2px',
              },
            },
          }}
          InputProps={{
            startAdornment: <EmailIcon sx={{ color: 'action.active', mr: 1 }} />,
          }}
        />
        
        <TextField
          fullWidth
          label="Password"
          name="password"
          type="password"
          value={formData.password}
          onChange={handleChange}
          margin="normal"
          required
          sx={{ 
            mb: 2,
            '& .MuiOutlinedInput-root': {
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              '& fieldset': {
                borderColor: '#E0E0E0',
                borderWidth: '2px',
              },
              '&:hover fieldset': {
                borderColor: '#76a6f6',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#76a6f6',
                borderWidth: '2px',
              },
            },
          }}
          InputProps={{
            startAdornment: <LockIcon sx={{ color: 'action.active', mr: 1 }} />,
          }}
        />

        <Button
          type="submit"
          fullWidth
          variant="contained"
          size="large"
          disabled={loading}
          sx={{ 
            mt: 2, 
            mb: 2, 
            py: 1.5,
            borderRadius: '12px',
            backgroundColor: '#76a6f6',
            color: '#FFFFFF',
            fontWeight: 600,
            fontSize: '1rem',
            boxShadow: '0 4px 12px rgba(118, 166, 246, 0.3)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              backgroundColor: '#4a7bc7',
              transform: 'translateY(-2px)',
              boxShadow: '0 8px 20px rgba(118, 166, 246, 0.4)',
            },
            '&:active': {
              transform: 'translateY(0px)',
              boxShadow: '0 4px 12px rgba(118, 166, 246, 0.3)',
            },
            '&:disabled': {
              backgroundColor: '#BDBDBD',
              color: '#757575',
              boxShadow: 'none',
              transform: 'none',
            },
          }}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
        </Button>
        </Box>
      </Box>

    </Box>
  );
}

export default Login;