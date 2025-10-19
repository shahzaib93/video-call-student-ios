import { createTheme } from '@mui/material/styles';

// Modern 2025 Desktop App Theme for Student App
export const modernTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#76a6f6', // Light blue
      light: '#a3c4f9',
      dark: '#4a7bc7',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#a3c4f9', // Lighter blue
      light: '#d1e2fc',
      dark: '#76a6f6',
      contrastText: '#2C2C2C',
    },
    background: {
      default: '#FFFFFF', // Clean white background
      paper: '#FFFFFF', // Clean white card/panel background
      surface: '#FFFFFF', // White surface elements
    },
    surface: {
      main: '#FFFFFF',
      light: '#FFFFFF',
      dark: '#FFFFFF',
    },
    text: {
      primary: '#2C2C2C',
      secondary: '#5A5A5A',
      disabled: '#9E9E9E',
    },
    divider: 'rgba(44, 44, 44, 0.12)',
    error: {
      main: '#D32F2F',
      light: '#EF5350',
      dark: '#C62828',
    },
    warning: {
      main: '#F57C00',
      light: '#FF9800',
      dark: '#E65100',
    },
    success: {
      main: '#388E3C',
      light: '#4CAF50',
      dark: '#2E7D32',
    },
    info: {
      main: '#76a6f6',
      light: '#a3c4f9',
      dark: '#4a7bc7',
    },
  },
  breakpoints: {
    values: {
      xs: 0,     // Mobile first
      sm: 480,   // Small mobile
      md: 768,   // Tablet
      lg: 1024,  // Desktop (moved from 960 to 1024)
      xl: 1440,  // Large desktop
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    // Mobile-first typography
    h1: {
      fontSize: '1.75rem', // Smaller on mobile
      fontWeight: 700,
      letterSpacing: '-0.02em',
      '@media (min-width:768px)': {
        fontSize: '2.5rem', // Larger on tablet+
      },
    },
    h2: {
      fontSize: '1.5rem', // Smaller on mobile
      fontWeight: 600,
      letterSpacing: '-0.01em',
      '@media (min-width:768px)': {
        fontSize: '2rem', // Larger on tablet+
      },
    },
    h3: {
      fontSize: '1.25rem', // Smaller on mobile
      fontWeight: 600,
      letterSpacing: '-0.01em',
      '@media (min-width:768px)': {
        fontSize: '1.75rem', // Larger on tablet+
      },
    },
    h4: {
      fontSize: '1.125rem', // Smaller on mobile
      fontWeight: 600,
      letterSpacing: '-0.005em',
      '@media (min-width:768px)': {
        fontSize: '1.5rem', // Larger on tablet+
      },
    },
    h5: {
      fontSize: '1rem', // Smaller on mobile
      fontWeight: 600,
      '@media (min-width:768px)': {
        fontSize: '1.25rem', // Larger on tablet+
      },
    },
    h6: {
      fontSize: '0.875rem', // Smaller on mobile
      fontWeight: 600,
      '@media (min-width:768px)': {
        fontSize: '1.125rem', // Larger on tablet+
      },
    },
    body1: {
      fontSize: '0.875rem',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.75rem',
      lineHeight: 1.5,
    },
    button: {
      fontSize: '0.875rem',
      fontWeight: 500,
      textTransform: 'none',
      letterSpacing: '0.02em',
    },
    caption: {
      fontSize: '0.75rem',
      fontWeight: 400,
      letterSpacing: '0.03em',
    },
  },
  shape: {
    borderRadius: 12,
  },
  shadows: [
    'none',
    '0px 1px 3px rgba(0, 0, 0, 0.1)',
    '0px 1px 4px rgba(0, 0, 0, 0.1)',
    '0px 2px 4px rgba(0, 0, 0, 0.1)',
    '0px 2px 6px rgba(0, 0, 0, 0.1)',
    '0px 3px 8px rgba(0, 0, 0, 0.1)',
    '0px 1px 3px rgba(0, 0, 0, 0.1)',
    '0px 1px 4px rgba(0, 0, 0, 0.1)',
    '0px 2px 4px rgba(0, 0, 0, 0.1)',
    '0px 2px 6px rgba(0, 0, 0, 0.1)',
    '0px 3px 8px rgba(0, 0, 0, 0.1)',
    '0px 3px 8px rgba(0, 0, 0, 0.1)',
    '0px 3px 8px rgba(0, 0, 0, 0.1)',
    '0px 3px 8px rgba(0, 0, 0, 0.1)',
    '0px 3px 8px rgba(0, 0, 0, 0.1)',
    '0px 3px 8px rgba(0, 0, 0, 0.1)',
    '0px 3px 8px rgba(0, 0, 0, 0.1)',
    '0px 3px 8px rgba(0, 0, 0, 0.1)',
    '0px 3px 8px rgba(0, 0, 0, 0.1)',
    '0px 3px 8px rgba(0, 0, 0, 0.1)',
    '0px 3px 8px rgba(0, 0, 0, 0.1)',
    '0px 3px 8px rgba(0, 0, 0, 0.1)',
    '0px 3px 8px rgba(0, 0, 0, 0.1)',
    '0px 3px 8px rgba(0, 0, 0, 0.1)',
    '0px 3px 8px rgba(0, 0, 0, 0.1)',
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarWidth: 'thin',
          scrollbarColor: '#76a6f6 #FFFFFF',
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: '#FFFFFF',
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#76a6f6',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: '#4a7bc7',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '12px 24px', // Larger tap targets for mobile
          minHeight: '44px', // iOS recommendation for tap targets
          transition: 'all 0.2s ease-in-out',
          '@media (max-width:768px)': {
            padding: '14px 28px', // Even larger on mobile
            minHeight: '48px',
          },
        },
        contained: {
          backgroundColor: '#76a6f6',
          color: '#FFFFFF',
          boxShadow: 'none',
          '&:hover': {
            backgroundColor: '#4a7bc7',
            boxShadow: 'none',
          },
        },
        outlined: {
          borderColor: '#76a6f6',
          backgroundColor: '#FFFFFF',
          color: '#76a6f6',
          '&:hover': {
            borderColor: '#4a7bc7',
            backgroundColor: '#76a6f6',
            color: '#FFFFFF',
          },
        },
        text: {
          color: '#76a6f6',
          '&:hover': {
            backgroundColor: 'rgba(118, 166, 246, 0.04)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF',
          border: '1px solid #E0E0E0',
          borderRadius: 16,
          boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.1)',
          transition: 'all 0.3s ease-in-out',
          padding: '16px', // Default padding for mobile
          '@media (min-width:768px)': {
            padding: '24px', // More padding on larger screens
          },
          '&:hover': {
            boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.1)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF',
          border: '1px solid #E0E0E0',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#FFFFFF',
          borderRight: '1px solid #E0E0E0',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E0E0E0',
          boxShadow: 'none',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          margin: '4px 8px',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            backgroundColor: '#F5F5F5',
          },
          '&.Mui-selected': {
            backgroundColor: '#F0F0F0',
            borderLeft: '3px solid #76a6f6',
            '&:hover': {
              backgroundColor: '#E8E8E8',
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          backgroundColor: '#F5F5F5',
          border: '1px solid #E0E0E0',
        },
        filled: {
          backgroundColor: '#76a6f6',
          color: '#FFFFFF',
        },
        outlined: {
          borderColor: '#76a6f6',
          color: '#76a6f6',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: '#FFFFFF',
            borderRadius: 8,
            '& fieldset': {
              borderColor: '#E0E0E0',
            },
            '&:hover fieldset': {
              borderColor: '#76a6f6',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#76a6f6',
            },
          },
        },
      },
    },
  },
});

export default modernTheme;