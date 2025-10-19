import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  Switch,
  FormControlLabel,
  Divider,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  useTheme,
  useMediaQuery,
  alpha,
  Stack,
} from '@mui/material';
import {
  Save as SaveIcon,
  Person as PersonIcon,
  Notifications as NotificationsIcon,
  VideoCall as VideoCallIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';
import { updatePassword, updateProfile as updateFirebaseProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import UserService from '../services/UserService';

function Settings({ user }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [profile, setProfile] = useState({
    username: user?.username || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [notifications, setNotifications] = useState({
    messageAlerts: true,
    teacherOnline: true,
    classReminders: true,
  });

  const [studySettings, setStudySettings] = useState({
    hdVideo: true,
    microphoneDefault: true,
    cameraDefault: true,
  });

  // Load settings from localStorage on component mount
  useEffect(() => {
    try {
      const savedNotifications = localStorage.getItem('studentNotificationSettings');
      const savedStudySettings = localStorage.getItem('studentStudySettings');

      if (savedNotifications) {
        setNotifications(JSON.parse(savedNotifications));
      }

      if (savedStudySettings) {
        setStudySettings(JSON.parse(savedStudySettings));
      }
    } catch (error) {
      console.error('Failed to load settings from localStorage:', error);
    }
  }, []);

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleProfileChange = (field, value) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleNotificationChange = (setting) => {
    setNotifications(prev => ({ ...prev, [setting]: !prev[setting] }));
  };

  const handleStudySettingChange = (setting) => {
    setStudySettings(prev => ({ ...prev, [setting]: !prev[setting] }));
  };

  const handleSaveProfile = async () => {
    try {
      setLoading(true);
      setError('');

      // Validate inputs
      if (!profile.username.trim()) {
        throw new Error('Username is required');
      }

      // Check if password change is requested
      const isPasswordChange = profile.newPassword.trim() !== '';

      if (isPasswordChange) {
        // Validate password fields
        if (!profile.currentPassword) {
          throw new Error('Current password is required to change password');
        }

        if (profile.newPassword.length < 6) {
          throw new Error('New password must be at least 6 characters');
        }

        if (profile.newPassword !== profile.confirmPassword) {
          throw new Error('New passwords do not match');
        }

        // Update password in Firebase Auth
        await updatePassword(auth.currentUser, profile.newPassword);
      }

      // Update username in Firebase Auth if it changed
      if (profile.username !== user.username) {
        await updateFirebaseProfile(auth.currentUser, {
          displayName: profile.username
        });
      }

      // Update user document in Firestore
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        username: profile.username,
        updatedAt: new Date()
      });

      // Update online status with new username
      await UserService.setOnline();

      setSaveSuccess(true);

      // Clear password fields after successful update
      setProfile(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));

    } catch (error) {
      console.error('Profile update error:', error);
      setError(error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }

    setTimeout(() => {
      setSaveSuccess(false);
      setError('');
    }, 5000);
  };

  const handleSaveSettings = () => {
    try {
      // Save settings to localStorage
      localStorage.setItem('studentNotificationSettings', JSON.stringify(notifications));
      localStorage.setItem('studentStudySettings', JSON.stringify(studySettings));
      setSaveSuccess(true);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setError('Failed to save settings');
    }
    setTimeout(() => {
      setSaveSuccess(false);
      setError('');
    }, 3000);
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          Settings
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage your profile, preferences and privacy settings
        </Typography>
      </Box>

      {saveSuccess && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Settings saved successfully!
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Stack spacing={3}>
        {/* Profile Settings */}
        <Card 
          sx={{ 
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${alpha(theme.palette.info.main, 0.05)} 100%)`,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
            borderRadius: 3,
            transition: 'all 0.3s ease-in-out',
            '&:hover': {
              transform: { xs: 'none', md: 'translateY(-2px)' },
              boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.15)}`,
            },
          }}
        >
          <CardContent sx={{ p: 3 }}>
            <Box display="flex" alignItems="center" mb={3}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${alpha(theme.palette.primary.main, 0.8)} 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mr: 2,
                  boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.4)}`,
                }}
              >
                <PersonIcon sx={{ color: 'white', fontSize: 20 }} />
              </Box>
              <Box>
                <Typography variant="h6" fontWeight={700} sx={{
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.info.main} 100%)`,
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}>
                  Profile Settings
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Update your personal information
                </Typography>
              </Box>
            </Box>
            
            <TextField
              fullWidth
              label="Username"
              value={profile.username}
              onChange={(e) => handleProfileChange('username', e.target.value)}
              margin="normal"
            />
            
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={profile.email}
              onChange={(e) => handleProfileChange('email', e.target.value)}
              margin="normal"
              disabled
              helperText="Email cannot be changed. Contact your teacher or administrator."
            />
            
            <Divider sx={{ my: 2 }} />
            
            <Typography variant="subtitle2" gutterBottom>
              Change Password
            </Typography>
            
            <TextField
              fullWidth
              label="Current Password"
              type="password"
              value={profile.currentPassword}
              onChange={(e) => handleProfileChange('currentPassword', e.target.value)}
              margin="normal"
            />
            
            <TextField
              fullWidth
              label="New Password"
              type="password"
              value={profile.newPassword}
              onChange={(e) => handleProfileChange('newPassword', e.target.value)}
              margin="normal"
              helperText="Must be at least 6 characters"
              error={Boolean(profile.newPassword && profile.newPassword.length < 6)}
            />

            <TextField
              fullWidth
              label="Confirm New Password"
              type="password"
              value={profile.confirmPassword}
              onChange={(e) => handleProfileChange('confirmPassword', e.target.value)}
              margin="normal"
              helperText={profile.newPassword && profile.confirmPassword && profile.newPassword !== profile.confirmPassword ? "Passwords do not match" : ""}
              error={Boolean(profile.newPassword && profile.confirmPassword && profile.newPassword !== profile.confirmPassword)}
            />
            
            <Button
              variant="contained"
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
              onClick={handleSaveProfile}
              disabled={loading}
              sx={{ 
                mt: 3,
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                color: 'white',
                fontWeight: 700,
                py: 1.5,
                borderRadius: 2,
                textTransform: 'none',
                boxShadow: `0 3px 12px ${alpha(theme.palette.primary.main, 0.4)}`,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  transform: 'translateY(-1px)',
                  boxShadow: `0 6px 20px ${alpha(theme.palette.primary.main, 0.5)}`,
                },
              }}
              fullWidth
            >
              {loading ? 'Saving...' : 'Save Profile'}
            </Button>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card 
          sx={{ 
            background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.08)} 0%, ${alpha(theme.palette.warning.main, 0.05)} 100%)`,
            border: `1px solid ${alpha(theme.palette.success.main, 0.12)}`,
            borderRadius: 3,
            transition: 'all 0.3s ease-in-out',
            '&:hover': {
              transform: { xs: 'none', md: 'translateY(-2px)' },
              boxShadow: `0 8px 32px ${alpha(theme.palette.success.main, 0.15)}`,
            },
          }}
        >
          <CardContent sx={{ p: 3 }}>
            <Box display="flex" alignItems="center" mb={3}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  background: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${alpha(theme.palette.success.main, 0.8)} 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mr: 2,
                  boxShadow: `0 4px 16px ${alpha(theme.palette.success.main, 0.4)}`,
                }}
              >
                <NotificationsIcon sx={{ color: 'white', fontSize: 20 }} />
              </Box>
              <Box>
                <Typography variant="h6" fontWeight={700} sx={{
                  background: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.warning.main} 100%)`,
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}>
                  Notification Settings
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Control your notification preferences
                </Typography>
              </Box>
            </Box>
            
            <Stack spacing={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={notifications.messageAlerts}
                    onChange={() => handleNotificationChange('messageAlerts')}
                  />
                }
                label="Message Alerts"
                sx={{ mx: 0 }}
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={notifications.teacherOnline}
                    onChange={() => handleNotificationChange('teacherOnline')}
                  />
                }
                label="Teacher Online Notifications"
                sx={{ mx: 0 }}
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={notifications.classReminders}
                    onChange={() => handleNotificationChange('classReminders')}
                  />
                }
                label="Class Reminders"
                sx={{ mx: 0 }}
              />
            </Stack>
          </CardContent>
        </Card>

        {/* Video Call Settings */}
        <Card 
          sx={{ 
            background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.08)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
            border: `1px solid ${alpha(theme.palette.info.main, 0.12)}`,
            borderRadius: 3,
            transition: 'all 0.3s ease-in-out',
            '&:hover': {
              transform: { xs: 'none', md: 'translateY(-2px)' },
              boxShadow: `0 8px 32px ${alpha(theme.palette.info.main, 0.15)}`,
            },
          }}
        >
          <CardContent sx={{ p: 3 }}>
            <Box display="flex" alignItems="center" mb={3}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  background: `linear-gradient(135deg, ${theme.palette.info.main} 0%, ${alpha(theme.palette.info.main, 0.8)} 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mr: 2,
                  boxShadow: `0 4px 16px ${alpha(theme.palette.info.main, 0.4)}`,
                }}
              >
                <VideoCallIcon sx={{ color: 'white', fontSize: 20 }} />
              </Box>
              <Box>
                <Typography variant="h6" fontWeight={700} sx={{
                  background: `linear-gradient(135deg, ${theme.palette.info.main} 0%, ${theme.palette.secondary.main} 100%)`,
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}>
                  Video Call Settings
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Configure your video call preferences
                </Typography>
              </Box>
            </Box>
            
            <Stack spacing={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={studySettings.hdVideo}
                    onChange={() => handleStudySettingChange('hdVideo')}
                  />
                }
                label="HD Video Quality"
                sx={{ mx: 0 }}
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={studySettings.microphoneDefault}
                    onChange={() => handleStudySettingChange('microphoneDefault')}
                  />
                }
                label="Turn on Microphone by Default"
                sx={{ mx: 0 }}
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={studySettings.cameraDefault}
                    onChange={() => handleStudySettingChange('cameraDefault')}
                  />
                }
                label="Turn on Camera by Default"
                sx={{ mx: 0 }}
              />
            </Stack>
            
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSaveSettings}
              sx={{ 
                mt: 3,
                background: `linear-gradient(135deg, ${theme.palette.info.main} 0%, ${theme.palette.info.dark} 100%)`,
                color: 'white',
                fontWeight: 700,
                py: 1.5,
                borderRadius: 2,
                textTransform: 'none',
                boxShadow: `0 3px 12px ${alpha(theme.palette.info.main, 0.4)}`,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  transform: 'translateY(-1px)',
                  boxShadow: `0 6px 20px ${alpha(theme.palette.info.main, 0.5)}`,
                },
              }}
              fullWidth
            >
              Save Settings
            </Button>
          </CardContent>
        </Card>

      </Stack>
    </Box>
  );
}

export default Settings;