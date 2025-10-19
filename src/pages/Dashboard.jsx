import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  Avatar,
  Button,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Chip,
  IconButton,
  Tooltip,
  useTheme,
  useMediaQuery,
  alpha,
} from '@mui/material';
import UserService from '../services/UserService';
import MessageService from '../services/MessageService';
import CallService from '../services/CallService';
import {
  Person as PersonIcon,
  Message as MessageIcon,
  Schedule as ScheduleIcon,
  Circle as OnlineIcon,
  Book as BookIcon,
  Assignment as AssignmentIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  AccessTime as AccessTimeIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';

function Dashboard({ user, webrtcService }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [teacher, setTeacher] = useState(null);
  const [recentMessages, setRecentMessages] = useState([]);
  const [upcomingClasses, setUpcomingClasses] = useState([]);
  const [stats, setStats] = useState({
    totalClasses: 0,
    unreadMessages: 0,
    callsThisWeek: 0,
    callsThisMonth: 0,
    successRate: 0,
    previousWeekClasses: 0
  });

  useEffect(() => {
    loadDashboardData();
    
    // Cleanup function for all listeners
    return () => {
      if (window.dashboardConversationsUnsubscribe) {
        window.dashboardConversationsUnsubscribe();
        window.dashboardConversationsUnsubscribe = null;
      }
      if (window.teacherStatusUnsubscribe) {
        window.teacherStatusUnsubscribe();
        window.teacherStatusUnsubscribe = null;
      }
    };
  }, []);


  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      if (!user?.id) {
        console.warn('No user ID available for loading dashboard data');
        return;
      }
      
      // Load assigned teacher using Firebase UserService
      const teacherResponse = await UserService.getMyTeacher(user.id);
      if (teacherResponse.success) {
        setTeacher(teacherResponse.teacher);
        
        // Set up real-time listener for teacher status changes
        const { doc, onSnapshot } = await import('firebase/firestore');
        const { db } = await import('../config/firebase');
        
        if (teacherResponse.teacher.id) {
          const teacherDocRef = doc(db, 'users', teacherResponse.teacher.id);
          const unsubscribeTeacher = onSnapshot(teacherDocRef, (doc) => {
          if (doc.exists()) {
            const updatedTeacher = { id: doc.id, ...doc.data() };
            setTeacher(updatedTeacher);
          }
        });
          
          // Store unsubscribe function for cleanup
          window.teacherStatusUnsubscribe = unsubscribeTeacher;
        }
      } else {
      }

      // Set up real-time conversations listener using Firebase MessageService
      try {
        const unsubscribe = MessageService.getConversations((conversations) => {
          // Get recent messages from conversations
          const recentConvs = conversations.slice(0, 3);
          const recentMsgs = recentConvs.map(conv => ({
            id: conv.id,
            content: conv.lastMessage || 'No messages yet',
            senderId: 'Teacher', // Since students only talk to teachers/admin
            timestamp: conv.lastMessageTime?.toDate?.() || new Date(),
            isRead: conv.unreadCount?.[user.id] === 0
          }));
          setRecentMessages(recentMsgs);
          
          // Count unread messages
          const unreadCount = conversations.reduce((total, conv) => total + (conv.unreadCount?.[user.id] || 0), 0);
          setStats(prev => ({
            ...prev,
            unreadMessages: unreadCount,
          }));
        });
        
        // Store unsubscribe function for cleanup (you might want to add this to a useEffect)
        window.dashboardConversationsUnsubscribe = unsubscribe;
      } catch (messageError) {
        console.error('Failed to setup messages listener:', messageError);
        setRecentMessages([]);
      }

      // Load call statistics from Firebase
      try {
        const callStatsResult = await CallService.getMyCallStats();
        if (callStatsResult.success) {
          const callStats = callStatsResult.stats;
          
          // Calculate previous week's classes for comparison
          const twoWeeksAgo = new Date();
          twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
          
          const callHistoryResult = await CallService.getMyCallHistory(200);
          const previousWeekClasses = callHistoryResult.success ? 
            callHistoryResult.calls.filter(call => {
              const callDate = call.startTime;
              const oneWeekAgo = new Date();
              oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
              return callDate && callDate >= twoWeeksAgo && callDate < oneWeekAgo;
            }).length : 0;
          
          setStats(prev => ({
            ...prev,
            totalClasses: callStats.totalCalls,
            callsThisWeek: callStats.callsThisWeek,
            callsThisMonth: callStats.callsThisMonth,
            successRate: callStats.successRate,
            previousWeekClasses: previousWeekClasses
          }));
        }
      } catch (callError) {
        console.error('Failed to load call statistics:', callError);
        setStats(prev => ({
          ...prev,
          totalClasses: 0,
          callsThisWeek: 0,
          callsThisMonth: 0,
          successRate: 0,
          previousWeekClasses: 0
        }));
      }

      // No schedule API available yet, set empty
      setUpcomingClasses([]);

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };


  const handleSendMessage = () => {
    // Navigate to messages page
    window.location.href = '#/messages';
  };

  const handleJoinClass = async () => {
    if (!teacher) {
      alert('No teacher assigned yet. Contact your administrator.');
      return;
    }

    if (!teacher.isOnline) {
      alert('Your teacher is currently offline. Please try again later.');
      return;
    }

    if (!webrtcService) {
      alert('Video call service is not available.');
      return;
    }

    try {
      await webrtcService.startCall(teacher.id, teacher.username);
    } catch (error) {
      console.error('Failed to join class:', error);
      alert('Failed to join class: ' + error.message);
    }
  };

  // Modern Stat Card Component matching teacher app
  function StatCard({ icon, title, value, change, color, subtitle, onClick, compact = false }) {
    const theme = useTheme();
    const isPositive = change >= 0;

    return (
      <Card
        sx={{
          height: { xs: 'auto', md: '100%' },
          minHeight: { xs: '90px', md: 'auto' },
          background: `linear-gradient(135deg, ${alpha(color, 0.1)} 0%, ${alpha(color, 0.05)} 100%)`,
          border: `1px solid ${alpha(color, 0.2)}`,
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 0.3s ease-in-out',
          cursor: onClick ? 'pointer' : 'default',
          '&:hover': {
            transform: { xs: 'none', md: 'translateY(-4px)' },
            boxShadow: { xs: 'none', md: `0 12px 32px ${alpha(color, 0.3)}` },
            border: { xs: `1px solid ${alpha(color, 0.2)}`, md: `1px solid ${alpha(color, 0.4)}` },
          },
        }}
        onClick={onClick}
      >
        <CardContent sx={{ p: { xs: 0.8, md: 3 } }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: { xs: 1, md: 2 } }}>
            <Box>
              <Box
                sx={{
                  width: { xs: 24, md: 48 },
                  height: { xs: 24, md: 48 },
                  borderRadius: 2,
                  background: `linear-gradient(135deg, ${color} 0%, ${alpha(color, 0.8)} 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: { xs: 0.8, md: 2 },
                  boxShadow: `0 4px 16px ${alpha(color, 0.4)}`,
                }}
              >
                {React.cloneElement(icon, { sx: { ...icon.props.sx, fontSize: { xs: 14, md: 24 } } })}
              </Box>
              
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: { xs: '0.6rem', md: '0.75rem' }, lineHeight: 1.2 }}>
                {title}
              </Typography>
              
              <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.2, mb: 0.3, fontSize: { xs: '1rem', md: '2.125rem' }, lineHeight: 1 }}>
                {typeof value === 'number' ? value.toLocaleString() : value}
              </Typography>
              
              {subtitle && (
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.55rem', md: '0.75rem' }, lineHeight: 1.2, opacity: 0.8 }}>
                  {subtitle}
                </Typography>
              )}
            </Box>
            
            {change !== undefined && (
              <Box
                sx={{
                  display: { xs: 'none', sm: 'flex' }, // Hide on mobile to save space
                  alignItems: 'center',
                  justifyContent: 'center',
                  px: { xs: 0.8, md: 1.2 },
                  py: { xs: 0.2, md: 0.4 },
                  borderRadius: 1,
                  backgroundColor: isPositive ? alpha(theme.palette.success.main, 0.1) : alpha(theme.palette.error.main, 0.1),
                  color: isPositive ? theme.palette.success.main : theme.palette.error.main,
                  border: `1px solid ${isPositive ? alpha(theme.palette.success.main, 0.3) : alpha(theme.palette.error.main, 0.3)}`,
                  fontSize: { xs: '0.55rem', md: '0.75rem' },
                  fontWeight: 600,
                  lineHeight: 1,
                }}
              >
                {isPositive ? <TrendingUpIcon sx={{ fontSize: { xs: 10, md: 14 }, mr: 0.3 }} /> : <TrendingDownIcon sx={{ fontSize: { xs: 10, md: 14 }, mr: 0.3 }} />}
                {`${isPositive ? '+' : ''}${change}%`}
              </Box>
            )}
          </Box>
        </CardContent>
        
        {/* Background decoration - hidden on mobile */}
        <Box
          sx={{
            display: { xs: 'none', md: 'block' },
            position: 'absolute',
            right: -24,
            bottom: -24,
            width: 96,
            height: 96,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${alpha(color, 0.1)} 0%, transparent 70%)`,
          }}
        />
      </Card>
    );
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="50vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: { xs: 2, md: 4 }, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ 
            fontWeight: 700, 
            mb: { xs: 0.5, md: 1 },
            fontSize: { xs: '1.5rem', md: '2.125rem' }
          }}>
            Good day, {user?.username}!
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{
            fontSize: { xs: '0.8rem', md: '0.875rem' }
          }}>
            Ready for today's learning session?
          </Typography>
        </Box>
        
        <Tooltip title="Refresh dashboard">
          <IconButton
            onClick={async () => {
              setRefreshing(true);
              await loadDashboardData();
              setTimeout(() => setRefreshing(false), 1000);
            }}
            sx={{
              backgroundColor: alpha(theme.palette.primary.main, 0.1),
              '&:hover': {
                backgroundColor: alpha(theme.palette.primary.main, 0.2),
              },
            }}
          >
            <RefreshIcon sx={{ 
              fontSize: 20,
              animation: refreshing ? 'spin 1s linear infinite' : 'none',
              '@keyframes spin': {
                '0%': { transform: 'rotate(0deg)' },
                '100%': { transform: 'rotate(360deg)' },
              },
            }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Stats - Horizontal scroll on mobile */}
      {isMobile ? (
        <Box 
          sx={{ 
            mb: { xs: 2, md: 3 },
            mx: -2, // Negative margin to extend to edges
            px: 2, // Padding to restore content position
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              gap: 1,
              overflowX: 'auto',
              pb: 1,
              // Hide scrollbar but keep functionality
              '&::-webkit-scrollbar': {
                display: 'none',
              },
              scrollbarWidth: 'none',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            <Box sx={{ minWidth: '140px', flex: '0 0 auto' }}>
              <StatCard
                icon={<BookIcon sx={{ color: 'white' }} />}
                title="Total Classes"
                value={stats.totalClasses}
                change={stats.previousWeekClasses > 0 ? Math.round(((stats.callsThisWeek - stats.previousWeekClasses) / stats.previousWeekClasses) * 100) : (stats.callsThisWeek > 0 ? 100 : 0)}
                color={theme.palette.primary.main}
                subtitle={`${stats.callsThisMonth} this month`}
              />
            </Box>
            
            <Box sx={{ minWidth: '140px', flex: '0 0 auto' }}>
              <StatCard
                icon={<AccessTimeIcon sx={{ color: 'white' }} />}
                title="This Week"
                value={stats.callsThisWeek}
                change={stats.previousWeekClasses > 0 ? Math.round(((stats.callsThisWeek - stats.previousWeekClasses) / stats.previousWeekClasses) * 100) : (stats.callsThisWeek > 0 ? 100 : 0)}
                color={theme.palette.primary.main}
                subtitle="Classes attended"
              />
            </Box>
            
            <Box sx={{ minWidth: '140px', flex: '0 0 auto' }}>
              <StatCard
                icon={<MessageIcon sx={{ color: 'white' }} />}
                title="New Messages"
                value={stats.unreadMessages}
                change={undefined}
                color={theme.palette.primary.main}
                subtitle="From teacher"
                onClick={() => window.location.href = '#/messages'}
              />
            </Box>
            
            <Box sx={{ minWidth: '140px', flex: '0 0 auto' }}>
              <StatCard
                icon={<TrendingUpIcon sx={{ color: 'white' }} />}
                title="Success Rate"
                value={`${stats.successRate}%`}
                change={stats.callsThisWeek > stats.previousWeekClasses ? Math.round(((stats.callsThisWeek - stats.previousWeekClasses) / Math.max(stats.previousWeekClasses, 1)) * 100) : 0}
                color={theme.palette.primary.main}
                subtitle="Call completion"
              />
            </Box>
          </Box>
          
          {/* Scroll indicator */}
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center',
            mt: 1,
            gap: 0.5,
          }}>
            {[0, 1, 2, 3].map((index) => (
              <Box
                key={index}
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  backgroundColor: theme.palette.action.disabled,
                  transition: 'all 0.3s',
                }}
              />
            ))}
          </Box>
        </Box>
      ) : (
        <Grid container spacing={{ xs: 1.5, md: 3 }} sx={{ mb: { xs: 2, md: 4 } }}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              icon={<BookIcon sx={{ color: 'white' }} />}
              title="Total Classes"
              value={stats.totalClasses}
              change={stats.previousWeekClasses > 0 ? Math.round(((stats.callsThisWeek - stats.previousWeekClasses) / stats.previousWeekClasses) * 100) : (stats.callsThisWeek > 0 ? 100 : 0)}
              color={theme.palette.primary.main}
              subtitle={`${stats.callsThisMonth} this month`}
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              icon={<AccessTimeIcon sx={{ color: 'white' }} />}
              title="This Week"
              value={stats.callsThisWeek}
              change={stats.previousWeekClasses > 0 ? Math.round(((stats.callsThisWeek - stats.previousWeekClasses) / stats.previousWeekClasses) * 100) : (stats.callsThisWeek > 0 ? 100 : 0)}
              color={theme.palette.primary.main}
              subtitle="Classes attended"
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              icon={<MessageIcon sx={{ color: 'white' }} />}
              title="New Messages"
              value={stats.unreadMessages}
              change={undefined}
              color={theme.palette.primary.main}
              subtitle="From teacher"
              onClick={() => window.location.href = '#/messages'}
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              icon={<TrendingUpIcon sx={{ color: 'white' }} />}
              title="Success Rate"
              value={`${stats.successRate}%`}
              change={stats.callsThisWeek > stats.previousWeekClasses ? Math.round(((stats.callsThisWeek - stats.previousWeekClasses) / Math.max(stats.previousWeekClasses, 1)) * 100) : 0}
              color={theme.palette.primary.main}
              subtitle="Call completion"
            />
          </Grid>
        </Grid>
      )}


      {/* Main Content */}
      <Grid container spacing={{ xs: 2, md: 3 }} sx={{ mt: { xs: 1, md: 2 } }}>
        {/* Teacher & Messages */}
        <Grid item xs={12} md={6}>
          <Card 
            sx={{ 
              height: { xs: 'auto', md: '100%' },
              minHeight: { xs: '120px', md: 'auto' },
              background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
              borderRadius: { xs: 2, md: 3 },
              transition: 'all 0.3s ease-in-out',
              '&:hover': {
                transform: { xs: 'none', md: 'translateY(-2px)' },
                boxShadow: { xs: 'none', md: `0 8px 32px ${alpha(theme.palette.primary.main, 0.15)}` },
              },
            }}
          >
            <CardContent sx={{ p: { xs: 1.2, md: 3 }, '&:last-child': { pb: { xs: 1.2, md: 3 } } }}>
            {!teacher ? (
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontSize: { xs: '0.9rem', md: '1rem' } }}>
                  My Teacher
                </Typography>
                <Alert severity="info" sx={{ fontSize: '0.8rem' }}>
                  No teacher assigned yet.
                </Alert>
              </Box>
            ) : (
              <Box>
                {/* Teacher Info */}
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={{ xs: 1, md: 1.5 }}>
                  <Box display="flex" alignItems="center" flex={1}>
                    <Avatar sx={{ 
                      width: { xs: 32, md: 40 }, 
                      height: { xs: 32, md: 40 }, 
                      mr: { xs: 1, md: 1.5 },
                      background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                      fontSize: { xs: '0.9rem', md: '1.2rem' },
                      fontWeight: 700,
                    }}>
                      {teacher.username?.[0]?.toUpperCase()}
                    </Avatar>
                    <Box flex={1}>
                      <Typography variant="body1" sx={{ 
                        fontSize: { xs: '0.9rem', md: '1rem' },
                        fontWeight: 600,
                        lineHeight: 1.2,
                      }}>
                        {teacher.username}
                      </Typography>
                      <Chip
                        icon={<OnlineIcon sx={{ fontSize: { xs: 10, md: 12 } }} />}
                        label={teacher.isOnline ? 'Online' : 'Offline'}
                        color={teacher.isOnline ? 'success' : 'default'}
                        size="small"
                        sx={{ 
                          fontSize: { xs: '0.65rem', md: '0.7rem' },
                          height: { xs: 18, md: 20 },
                          mt: 0.5,
                        }}
                      />
                    </Box>
                  </Box>
                  <Box display="flex" alignItems="center" gap={0.5}>
                    {stats.unreadMessages > 0 && (
                      <Chip 
                        label={stats.unreadMessages} 
                        color="error" 
                        size="small"
                        sx={{
                          fontSize: { xs: '0.7rem', md: '0.75rem' },
                          height: { xs: 18, md: 20 },
                        }}
                      />
                    )}
                    <Button
                      variant="contained"
                      size="small"
                      onClick={handleSendMessage}
                      sx={{
                        background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                        color: 'white',
                        fontWeight: 600,
                        py: { xs: 0.5, md: 0.75 },
                        px: { xs: 1.5, md: 2 },
                        borderRadius: 1.5,
                        textTransform: 'none',
                        fontSize: { xs: '0.75rem', md: '0.875rem' },
                        minWidth: { xs: 'auto', md: '80px' },
                        boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.3)}`,
                        '&:hover': {
                          boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.4)}`,
                        },
                      }}
                    >
                      Message
                    </Button>
                  </Box>
                </Box>

                {/* Recent Messages Preview */}
                {recentMessages.length > 0 && (
                  <Box sx={{ 
                    borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                    pt: { xs: 0.8, md: 1 }
                  }}>
                    <Typography variant="caption" color="text.secondary" sx={{ 
                      fontSize: { xs: '0.7rem', md: '0.75rem' },
                      mb: 0.5,
                      display: 'block'
                    }}>
                      Recent message:
                    </Typography>
                    <Box>
                      {recentMessages.slice(0, 1).map((message) => (
                        <Box key={message.id} display="flex" alignItems="center" justifyContent="space-between">
                          <Box flex={1}>
                            <Typography variant="body2" sx={{ 
                              fontSize: { xs: '0.8rem', md: '0.85rem' },
                              fontWeight: 400,
                              lineHeight: 1.2,
                              color: 'text.secondary'
                            }}>
                              "{message.content?.substring(0, isMobile ? 25 : 35)}..."
                            </Typography>
                          </Box>
                          {!message.isRead && (
                            <Box sx={{ 
                              width: { xs: 6, md: 8 }, 
                              height: { xs: 6, md: 8 }, 
                              borderRadius: '50%', 
                              bgcolor: 'error.main',
                              ml: 1
                            }} />
                          )}
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}
              </Box>
            )}
            </CardContent>
          </Card>
        </Grid>

        {/* Upcoming Classes */}
        <Grid item xs={12} md={6}>
          <Card 
            sx={{ 
              height: { xs: 'auto', md: '100%' },
              minHeight: { xs: '80px', md: 'auto' },
              background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
              borderRadius: { xs: 2, md: 3 },
              transition: 'all 0.3s ease-in-out',
              '&:hover': {
                transform: { xs: 'none', md: 'translateY(-2px)' },
                boxShadow: { xs: 'none', md: `0 8px 32px ${alpha(theme.palette.primary.main, 0.15)}` },
              },
            }}
          >
            <CardContent sx={{ p: { xs: 1.2, md: 3 }, '&:last-child': { pb: { xs: 1.2, md: 3 } } }}>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={{ xs: 0.5, md: 2 }}>
                <Box display="flex" alignItems="center">
                  <ScheduleIcon sx={{ 
                    color: theme.palette.primary.main, 
                    fontSize: { xs: 18, md: 24 },
                    mr: { xs: 0.5, md: 1 }
                  }} />
                  <Typography variant="body2" sx={{ 
                    fontSize: { xs: '0.9rem', md: '1rem' },
                    fontWeight: 600,
                    color: theme.palette.primary.main,
                  }}>
                    Today's Schedule
                  </Typography>
                </Box>
              </Box>
              
              {upcomingClasses.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ 
                  fontSize: { xs: '0.8rem', md: '0.875rem' },
                  fontStyle: 'italic'
                }}>
                  No classes scheduled for today
                </Typography>
              ) : (
                <Box>
                  {upcomingClasses.slice(0, 2).map((classItem, index) => (
                    <Box key={classItem.id} display="flex" alignItems="center" justifyContent="space-between" 
                         sx={{ py: { xs: 0.5, md: 1 }, borderBottom: index < 1 ? `1px solid ${alpha(theme.palette.divider, 0.1)}` : 'none' }}>
                      <Box>
                        <Typography variant="body2" sx={{ 
                          fontSize: { xs: '0.8rem', md: '0.9rem' },
                          fontWeight: 500,
                          lineHeight: 1.2,
                        }}>
                          {classItem.time} - {classItem.subject}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ 
                          fontSize: { xs: '0.7rem', md: '0.75rem' } 
                        }}>
                          with {classItem.teacher}
                        </Typography>
                      </Box>
                      <Button 
                        variant="contained" 
                        size="small"
                        sx={{
                          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                          color: 'white',
                          fontWeight: 600,
                          borderRadius: 1.5,
                          textTransform: 'none',
                          fontSize: { xs: '0.7rem', md: '0.75rem' },
                          py: { xs: 0.3, md: 0.5 },
                          px: { xs: 1, md: 1.5 },
                          minWidth: { xs: 'auto', md: '60px' },
                          boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.3)}`,
                        }}
                      >
                        Join
                      </Button>
                    </Box>
                  ))}
                  {upcomingClasses.length > 2 && (
                    <Typography variant="caption" color="text.secondary" sx={{ 
                      fontSize: { xs: '0.7rem', md: '0.75rem' },
                      display: 'block',
                      mt: 0.5
                    }}>
                      +{upcomingClasses.length - 2} more classes
                    </Typography>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

      </Grid>
    </Box>
  );
}

export default Dashboard;
