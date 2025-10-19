import React, { useState, useEffect } from 'react';
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Chip,
  Divider,
  Tooltip,
  Badge,
  Paper,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Message as MessageIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Circle as CircleIcon,
  ExpandLess,
  ExpandMore,
  Close as CloseIcon,
  Minimize as MinimizeIcon,
  CropSquare as MaximizeIcon,
  School as SchoolIcon,
  History as HistoryIcon,
  Menu as MenuIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

const drawerWidth = 280;
const mobileDrawerWidth = 280;

// Student menu items
const baseMenuItems = [
  { 
    path: '/dashboard', 
    label: 'Dashboard', 
    icon: <DashboardIcon />,
    description: 'Overview and study progress'
  },
  { 
    path: '/messages', 
    label: 'Messages', 
    icon: <MessageIcon />,
    description: 'Chat with teacher and admin'
  },
  { 
    path: '/call-logs', 
    label: 'Call History', 
    icon: <HistoryIcon />,
    description: 'View past video call sessions'
  },
  { 
    path: '/settings', 
    label: 'Settings', 
    icon: <SettingsIcon />,
    description: 'App preferences and profile'
  },
];


// Modern Sidebar Component
function ModernSidebar({ user, onLogout, apiClient, mobileOpen, handleDrawerToggle }) {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [badges, setBadges] = useState({
    messages: 0,
  });
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'));

  useEffect(() => {
    loadBadgeData();
  }, []);

  const loadBadgeData = async () => {
    try {
      if (!apiClient) return;

      // For students, we'll load different badge data
      setBadges({
        messages: 0, // Unread messages count
      });
    } catch (error) {
      console.error('Failed to load badge data:', error);
    }
  };

  // Create menu items with dynamic badges
  const menuItems = baseMenuItems.map(item => ({
    ...item,
    badge: item.path === '/messages' ? badges.messages : null
  }));

  const handleLogout = () => {
    onLogout();
  };

  const handleNavigation = (path) => {
    navigate(path);
    // Close mobile drawer after navigation
    if (isMobile) {
      handleDrawerToggle();
    }
  };

  const drawerContent = (
    <>
      {/* Header */}
      <Box sx={{ 
        p: 3, 
        background: 'rgba(255, 255, 255, 0.15)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.25)',
        position: 'relative',
        zIndex: 2,
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <Box
            component="img"
            src="/logo only.png"
            alt="Tarteel-e-Quran Logo"
            sx={{
              width: 32,
              height: 32,
              objectFit: 'contain',
            }}
          />
          <Typography 
            variant="h5" 
            sx={{ 
              fontWeight: 700,
              color: 'text.primary',
            }}
          >
            Student Portal
          </Typography>
        </Box>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
          Welcome, {user?.username || 'Student'}!
        </Typography>
      </Box>

      {/* Navigation - Scrollable */}
      <Box sx={{ 
        flex: 1, 
        p: 2,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <Box sx={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          // Custom scrollbar styling
          '&::-webkit-scrollbar': {
            width: '6px',
          },
          '&::-webkit-scrollbar-track': {
            background: `rgba(${theme.palette.primary.main.replace('#', '').match(/.{2}/g).map(hex => parseInt(hex, 16)).join(', ')}, 0.1)`,
            borderRadius: '10px',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: theme.palette.primary.main,
            borderRadius: '10px',
            '&:hover': {
              backgroundColor: theme.palette.primary.dark,
            },
          },
        }}>
          <List sx={{ gap: 1 }}>
          {menuItems.map((item) => {
            const isSelected = location.pathname === item.path;
            
            return (
              <Tooltip
                key={item.path}
                title={item.description}
                placement="right"
                arrow
              >
                <ListItemButton
                  selected={isSelected}
                  onClick={() => handleNavigation(item.path)}
                  sx={{
                    borderRadius: 2,
                    mb: 1,
                    minHeight: { xs: 56, md: 48 }, // Larger tap targets on mobile
                    px: { xs: 3, md: 2 }, // More padding on mobile
                    position: 'relative',
                    overflow: 'hidden',
                    '&::before': isSelected ? {
                      content: '""',
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: 4,
                      backgroundColor: theme.palette.primary.main,
                      borderRadius: '0 4px 4px 0',
                    } : {},
                    '&:hover': {
                      backgroundColor: `rgba(${theme.palette.primary.main.replace('#', '').match(/.{2}/g).map(hex => parseInt(hex, 16)).join(', ')}, 0.08)`,
                      transform: 'translateX(4px)',
                      '& .MuiListItemIcon-root': {
                        color: theme.palette.primary.main,
                      },
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      color: isSelected ? theme.palette.primary.main : 'text.secondary',
                      minWidth: 40,
                      transition: 'all 0.2s ease-in-out',
                    }}
                  >
                    {item.badge ? (
                      <Badge badgeContent={item.badge} color="error">
                        {item.icon}
                      </Badge>
                    ) : (
                      item.icon
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      fontSize: '0.875rem',
                      fontWeight: isSelected ? 600 : 500,
                      color: isSelected ? 'primary.main' : 'text.primary',
                    }}
                  />
                </ListItemButton>
              </Tooltip>
            );
          })}
          </List>
        </Box>
      </Box>

      {/* User Profile */}
      <Box sx={{ 
        p: 2, 
        background: 'rgba(255, 255, 255, 0.1)',
        borderTop: '1px solid rgba(255, 255, 255, 0.2)',
        position: 'relative',
        zIndex: 2,
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}>

        {/* Direct Logout Button */}
        <Box
          onClick={handleLogout}
          sx={{
            display: 'flex',
            alignItems: 'center',
            p: 2,
            borderRadius: 2,
            cursor: 'pointer',
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
            border: `1px solid ${theme.palette.divider}`,
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              backgroundColor: theme.palette.error.main,
              borderColor: theme.palette.error.main,
              transform: 'translateY(-2px)',
              boxShadow: `0 4px 12px ${theme.palette.error.main}40`,
              '& .MuiSvgIcon-root': {
                color: '#FFFFFF',
              },
              '& .MuiTypography-root': {
                color: '#FFFFFF',
                fontWeight: 600,
              },
            },
          }}
        >
          <LogoutIcon sx={{ 
            fontSize: 18, 
            color: theme.palette.text.secondary,
            mr: 2,
            transition: 'all 0.2s ease-in-out',
          }} />
          <Typography 
            variant="body2" 
            sx={{
              fontWeight: 600,
              color: theme.palette.text.primary,
              transition: 'all 0.2s ease-in-out',
            }}
          >
            Sign Out
          </Typography>
        </Box>
      </Box>
    </>
  );

  return (
    <Box component="nav" sx={{ 
      width: { lg: drawerWidth }, // No margins needed for square layout
      flexShrink: { lg: 0 },
    }}>
      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ 
          keepMounted: true,
          BackdropProps: {
            sx: { backgroundColor: 'transparent' }
          }
        }}
        sx={{
          display: { xs: 'block', lg: 'none' },
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: 0, // Square corners
            border: '1px solid rgba(255, 255, 255, 0.2)',
            
            // Glass effect shadows
            boxShadow: `
              0 8px 32px rgba(0, 0, 0, 0.12),
              0 4px 16px rgba(0, 0, 0, 0.08),
              inset 0 1px 0 rgba(255, 255, 255, 0.3),
              inset 0 -1px 0 rgba(255, 255, 255, 0.1)
            `,
            
            // Glass morphism blur effect
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            
            // Glossy highlight overlay
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '50%',
              background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.05) 50%, transparent 100%)',
              pointerEvents: 'none',
              zIndex: 1,
              borderRadius: 0,
            },
            
            // Scrollable content
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        {drawerContent}
      </Drawer>
      
      {/* Desktop drawer - Fancy Floating Style */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', lg: 'block' },
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            
            // True glossy/glass sidebar - transparent with background visible
            background: 'rgba(255, 255, 255, 0.1)',
            marginTop: 0,
            marginLeft: 0,
            marginBottom: 0,
            marginRight: 0,
            height: '100vh',
            borderRadius: 0, // Square corners to match layout
            border: '1px solid rgba(255, 255, 255, 0.2)',
            
            // Glass effect shadows
            boxShadow: `
              0 8px 32px rgba(0, 0, 0, 0.12),
              0 4px 16px rgba(0, 0, 0, 0.08),
              inset 0 1px 0 rgba(255, 255, 255, 0.3),
              inset 0 -1px 0 rgba(255, 255, 255, 0.1)
            `,
            
            // Glass morphism blur effect
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            
            // Glossy highlight overlay
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '50%',
              background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.05) 50%, transparent 100%)',
              pointerEvents: 'none',
              zIndex: 1,
              borderRadius: 0,
            },
            
            // Smooth transitions
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            
            // Scrollable content
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
        open
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
}

// Modern Title Bar Component
function ModernTitleBar({ currentPath, handleDrawerToggle }) {
  const theme = useTheme();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'));
  
  const getPageTitle = () => {
    const path = currentPath || location.pathname;
    const menuItem = baseMenuItems.find(item => item.path === path);
    return menuItem ? menuItem.label : 'Dashboard';
  };
  
  return (
    <>
    {isMobile && (
    <Paper
      elevation={2}
      sx={{
        height: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 3,
        pt: 'env(safe-area-inset-top)', // Safe area for status bar
        background: theme.palette.primary.main,
        backdropFilter: 'blur(20px)',
        borderRadius: 0,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
        WebkitAppRegion: 'drag',
        position: 'fixed',
        top: 0,
        left: { xs: 0, md: 0 },
        right: 0,
        zIndex: theme.zIndex.appBar + 1,
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: 'linear-gradient(90deg, transparent 0%, rgba(51, 150, 211, 0.5) 50%, transparent 100%)',
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={handleDrawerToggle}
          sx={{ WebkitAppRegion: 'no-drag' }}
        >
          <MenuIcon />
        </IconButton>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            component="img"
            src="/logo only.png"
            alt="Tarteel-e-Quran Logo"
            sx={{
              width: 40,
              height: 40,
              objectFit: 'contain',
            }}
          />
          <Typography 
            variant="h6" 
            sx={{ 
              color: 'white',
              fontWeight: 600,
              fontSize: '1.1rem',
            }}
          >
            Tarteel-e-Quran
          </Typography>
        </Box>
      </Box>
    </Paper>
    )}
    </>
  );
}

// Main Layout Component
function ModernLayout({ children, user, onLogout, socketManager, apiClient }) {
  const theme = useTheme();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <Box sx={{ 
      display: 'flex',
      minHeight: '100vh',
      backgroundColor: theme.palette.background.default,
      padding: 0, // Remove all padding
    }}>
      {/* Sidebar */}
      <ModernSidebar 
        user={user} 
        onLogout={onLogout} 
        apiClient={apiClient}
        mobileOpen={mobileOpen}
        handleDrawerToggle={handleDrawerToggle}
      />
      
      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          width: { xs: '100%', lg: `calc(100% - ${drawerWidth}px)` }, // Account for square sidebar width
          marginLeft: { xs: 0, lg: 0 }, // No margin, let flexbox handle positioning
          position: 'relative',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', // Smooth transitions
          overflow: 'hidden', // Prevent content from leaking outside
        }}
      >
        {/* Custom Title Bar */}
        <ModernTitleBar handleDrawerToggle={handleDrawerToggle} />
        
        {/* Content */}
        <Box
          sx={{
            flex: 1,
            mt: { xs: 'calc(100px + env(safe-area-inset-top))', lg: '0px' }, // Account for fixed header + status bar on mobile
            p: { xs: 2, sm: 3 }, // Responsive padding
            overflow: 'auto',
            overflowX: 'hidden',
            position: 'relative', // Ensure proper stacking context
            height: { xs: 'calc(100vh - 100px - env(safe-area-inset-top))', lg: '100vh' }, // Account for header + status bar on mobile
            '&::-webkit-scrollbar': {
              width: '8px',
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: 'transparent',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
              borderRadius: '4px',
            },
            '&::-webkit-scrollbar-thumb:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
            },
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}

export default ModernLayout;