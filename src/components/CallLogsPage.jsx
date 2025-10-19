import React, { useState, useEffect } from 'react';
import CallService from '../services/CallService';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  Box,
  Typography,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Card,
  CardContent,
  Grid,
  Tooltip,
  Menu,
  MenuItem,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  Stack,
  Divider,
  Pagination,
  useTheme,
  useMediaQuery,
  alpha,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction
} from '@mui/material';
import {
  VideoCall as VideoCallIcon,
  History as HistoryIcon,
  MoreVert as MoreVertIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import { formatDistanceToNow, format } from 'date-fns';

// Modern Stat Card Component
function StatCard({ icon, title, value, subtitle, color }) {
  const theme = useTheme();

  return (
    <Card
      sx={{
        height: '100%',
        background: `linear-gradient(135deg, ${alpha(color, 0.1)} 0%, ${alpha(color, 0.05)} 100%)`,
        border: `1px solid ${alpha(color, 0.2)}`,
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.3s ease-in-out',
        '&:hover': {
          transform: { xs: 'none', md: 'translateY(-4px)' },
          boxShadow: { xs: 'none', md: `0 12px 32px ${alpha(color, 0.3)}` },
          border: { xs: `1px solid ${alpha(color, 0.2)}`, md: `1px solid ${alpha(color, 0.4)}` },
        },
      }}
    >
      <CardContent sx={{ p: { xs: 2, md: 3 } }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: { xs: 1, md: 2 } }}>
          <Box>
            <Box
              sx={{
                width: { xs: 32, md: 48 },
                height: { xs: 32, md: 48 },
                borderRadius: 2,
                background: `linear-gradient(135deg, ${color} 0%, ${alpha(color, 0.8)} 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: { xs: 1, md: 2 },
                boxShadow: `0 4px 16px ${alpha(color, 0.4)}`,
              }}
            >
              {React.cloneElement(icon, { sx: { ...icon.props.sx, fontSize: { xs: 18, md: 24 }, color: 'white' } })}
            </Box>
            
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: { xs: '0.6rem', md: '0.75rem' }, lineHeight: 1.2 }}>
              {title}
            </Typography>
            
            <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.2, mb: 0.3, fontSize: { xs: '1.25rem', md: '2.125rem' }, lineHeight: 1 }}>
              {typeof value === 'number' ? value.toLocaleString() : value}
            </Typography>
            
            {subtitle && (
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.6rem', md: '0.75rem' }, lineHeight: 1.2, opacity: 0.8 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
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

const CallLogsPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCall, setSelectedCall] = useState(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [actionCallId, setActionCallId] = useState(null);
  const [stats, setStats] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const callsPerPage = 10;

  useEffect(() => {
    fetchCallLogs();
    fetchStats();
  }, [statusFilter, currentPage]);

  // Function to fetch teacher details from users collection
  const fetchTeacherDetails = async (teacherId) => {
    try {
      const teacherDoc = await getDoc(doc(db, 'users', teacherId));
      if (teacherDoc.exists()) {
        const teacherData = teacherDoc.data();
        return {
          username: teacherData.username || 'Unknown Teacher',
          email: teacherData.email || 'No email available'
        };
      }
    } catch (error) {
      console.warn('Could not fetch teacher details for ID:', teacherId, error);
    }
    return {
      username: 'Unknown Teacher',
      email: 'No email available'
    };
  };

  const fetchCallLogs = async () => {
    try {
      setLoading(true);

      // Get total count first to calculate pages
      const countResult = await CallService.getMyCallCount(statusFilter);
      if (countResult.success) {
        const totalCalls = countResult.count;
        setTotalPages(Math.ceil(totalCalls / callsPerPage));
      }

      // Get calls for current page
      const result = await CallService.getMyCallHistory(callsPerPage, currentPage, statusFilter);

      if (result.success) {
        // Fetch teacher details for each call
        const callsWithTeacherInfo = await Promise.all(
          result.calls.map(async (call) => {
            if (call.teacherId) {
              const teacherDetails = await fetchTeacherDetails(call.teacherId);
              return {
                ...call,
                teacher: {
                  username: teacherDetails.username,
                  email: teacherDetails.email
                }
              };
            }
            return {
              ...call,
              teacher: {
                username: 'Unknown Teacher',
                email: 'No email available'
              }
            };
          })
        );

        setCalls(callsWithTeacherInfo);
        setError(null);
      } else {
        throw new Error(result.error || 'Failed to fetch call logs');
      }
    } catch (error) {
      console.error('❌ Error fetching call logs:', error);
      setError('Failed to load call logs. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (event, newPage) => {
    setCurrentPage(newPage);
  };

  const handleStatusFilterChange = (event) => {
    setStatusFilter(event.target.value);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  const fetchStats = async () => {
    try {
      
      const result = await CallService.getMyCallStats();
      
      if (result.success) {
        setStats(result.stats);
      } else {
        console.error('❌ Failed to fetch stats:', result.error);
      }
    } catch (error) {
      console.error('❌ Error fetching stats:', error);
    }
  };

  const fetchCallDetails = async (callId) => {
    try {
      
      // Find the call in our existing calls array
      const call = calls.find(c => c.id === callId || c.callId === callId);
      if (call) {
        setSelectedCall(call);
        setDetailsDialogOpen(true);
      } else {
        throw new Error('Call not found');
      }
    } catch (error) {
      console.error('❌ Error fetching call details:', error);
      setError('Failed to load call details.');
    }
  };

  const handleMenuOpen = (event, callId) => {
    setAnchorEl(event.currentTarget);
    setActionCallId(callId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setActionCallId(null);
  };

  const handleViewDetails = () => {
    handleMenuClose();
    fetchCallDetails(actionCallId);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ended':
        return 'success';
      case 'rejected':
        return 'error';
      case 'failed':
        return 'error';
      case 'accepted':
      case 'connected':
        return 'primary';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'ended':
        return <CheckCircleIcon />;
      case 'rejected':
      case 'failed':
        return <ErrorIcon />;
      case 'accepted':
      case 'connected':
        return <VideoCallIcon />;
      default:
        return <ScheduleIcon />;
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <HistoryIcon />
            Call History
          </Typography>
          <Typography variant="body2" color="text.secondary">
            View your past video calls and sessions
          </Typography>
        </Box>
        
        <Tooltip title="Refresh call logs">
          <IconButton
            onClick={() => {
              fetchCallLogs();
              fetchStats();
            }}
            sx={{
              backgroundColor: alpha(theme.palette.primary.main, 0.1),
              '&:hover': {
                backgroundColor: alpha(theme.palette.primary.main, 0.2),
              },
            }}
          >
            <RefreshIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Tooltip>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Stats - Horizontal scroll on mobile like Dashboard */}
      {stats && (
        isMobile ? (
          <Box 
            sx={{ 
              mb: 3,
              mx: -2, // Negative margin to extend to edges
              px: 2, // Padding to restore content position
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                gap: 1.5,
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
              <Box sx={{ minWidth: '160px', flex: '0 0 auto' }}>
                <StatCard
                  icon={<VideoCallIcon />}
                  title="Total Calls"
                  value={stats.totalCalls}
                  color={theme.palette.primary.main}
                  subtitle="All time"
                />
              </Box>
              
              <Box sx={{ minWidth: '160px', flex: '0 0 auto' }}>
                <StatCard
                  icon={<CheckCircleIcon />}
                  title="Successful"
                  value={stats.successfulCalls}
                  color={theme.palette.success.main}
                  subtitle={`${stats.totalCalls > 0 ? Math.round((stats.successfulCalls / stats.totalCalls) * 100) : 0}% rate`}
                />
              </Box>
              
              <Box sx={{ minWidth: '160px', flex: '0 0 auto' }}>
                <StatCard
                  icon={<ScheduleIcon />}
                  title="Duration"
                  value={formatDuration(stats.totalDuration)}
                  color={theme.palette.info.main}
                  subtitle={`Avg: ${formatDuration(Math.round(stats.averageDuration))}`}
                />
              </Box>
              
              <Box sx={{ minWidth: '160px', flex: '0 0 auto' }}>
                <StatCard
                  icon={<PersonIcon />}
                  title="Recording"
                  value={formatFileSize(stats.totalRecordingSize)}
                  color={theme.palette.secondary.main}
                  subtitle="Storage used"
                />
              </Box>
            </Box>
          </Box>
        ) : (
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                icon={<VideoCallIcon />}
                title="Total Calls"
                value={stats.totalCalls}
                color={theme.palette.primary.main}
                subtitle="All time"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                icon={<CheckCircleIcon />}
                title="Successful"
                value={stats.successfulCalls}
                color={theme.palette.success.main}
                subtitle={`${stats.totalCalls > 0 ? Math.round((stats.successfulCalls / stats.totalCalls) * 100) : 0}% success rate`}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                icon={<ScheduleIcon />}
                title="Duration"
                value={formatDuration(stats.totalDuration)}
                color={theme.palette.info.main}
                subtitle={`Avg: ${formatDuration(Math.round(stats.averageDuration))}`}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                icon={<PersonIcon />}
                title="Recording"
                value={formatFileSize(stats.totalRecordingSize)}
                color={theme.palette.secondary.main}
                subtitle="Storage used"
              />
            </Grid>
          </Grid>
        )
      )}

      {/* Filters */}
      <Box sx={{ mb: 3 }}>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Status Filter</InputLabel>
          <Select
            value={statusFilter}
            label="Status Filter"
            onChange={handleStatusFilterChange}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="ended">Completed</MenuItem>
            <MenuItem value="rejected">Rejected</MenuItem>
            <MenuItem value="failed">Failed</MenuItem>
            <MenuItem value="accepted">In Progress</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Call Logs - Compact Mobile List */}
      {calls.length === 0 ? (
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <HistoryIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No calls found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Your call history will appear here once you start making video calls.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Card sx={{ mb: 3 }}>
          <List sx={{ p: 0 }}>
            {calls.map((call, index) => (
              <React.Fragment key={call.callId || call.id}>
                <ListItem
                  sx={{
                    py: 2,
                    px: 2,
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.04),
                    },
                  }}
                >
                  <ListItemAvatar>
                    <Avatar sx={{ 
                      backgroundColor: alpha(theme.palette.primary.main, 0.1),
                      color: theme.palette.primary.main,
                      width: 40,
                      height: 40,
                    }}>
                      <PersonIcon sx={{ fontSize: 20 }} />
                    </Avatar>
                  </ListItemAvatar>
                  
                  <ListItemText
                    sx={{ pr: 5 }} // Much more padding to avoid overlap with menu button
                    primary={
                      <Box sx={{ mb: 0.5 }}>
                        <Typography variant="body1" fontWeight={600} sx={{ fontSize: '0.95rem', mb: 0.5 }}>
                          {call.teacher?.username || 'Unknown Teacher'}
                        </Typography>
                        <Chip
                          label={call.status}
                          color={getStatusColor(call.status)}
                          size="small"
                          icon={getStatusIcon(call.status)}
                          sx={{ 
                            height: 20,
                            fontSize: '0.65rem',
                            '& .MuiSvgIcon-root': {
                              fontSize: 11,
                            },
                          }}
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 0.5, pr: 1 }}>
                          <Typography variant="caption" color="text.secondary">
                            {call.startTime ? format(new Date(call.startTime), 'MMM d, HH:mm') : 'N/A'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" fontWeight={500}>
                            {formatDuration(call.duration)}
                          </Typography>
                        </Box>
                        
                        {call.recording && call.recording.enabled && (
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 0.5, 
                            mt: 0.5,
                          }}>
                            <Box sx={{ 
                              width: 6, 
                              height: 6, 
                              borderRadius: '50%', 
                              backgroundColor: theme.palette.success.main,
                            }} />
                            <Typography variant="caption" color="success.main" fontWeight={500}>
                              Recorded
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    }
                  />
                  
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      onClick={(e) => handleMenuOpen(e, call.callId || call.id)}
                      size="small"
                      sx={{
                        backgroundColor: 'transparent',
                        '&:hover': {
                          backgroundColor: alpha(theme.palette.action.hover, 0.5),
                        },
                      }}
                    >
                      <MoreVertIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
                
                {/* Divider between items, but not after the last item */}
                {index < calls.length - 1 && (
                  <Divider sx={{ mx: 2 }} />
                )}
              </React.Fragment>
            ))}
          </List>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination
            count={totalPages}
            page={currentPage}
            onChange={handlePageChange}
            color="primary"
            size="large"
            showFirstButton
            showLastButton
            sx={{
              '& .MuiPaginationItem-root': {
                fontSize: '1rem',
              },
            }}
          />
        </Box>
      )}

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleViewDetails}>
          <VisibilityIcon sx={{ mr: 1 }} />
          View Details
        </MenuItem>
      </Menu>

      {/* Call Details Dialog */}
      <Dialog open={detailsDialogOpen} onClose={() => setDetailsDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white' }}>
          Call Details
        </DialogTitle>
        <DialogContent>
          {selectedCall && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                    <Typography variant="h6" gutterBottom color="primary">
                      Call Information
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Stack spacing={2}>
                      <Box>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Call ID
                        </Typography>
                        <Typography variant="body1" sx={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>
                          {selectedCall.callId || selectedCall.id}
                        </Typography>
                      </Box>
                      
                      <Box>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Status
                        </Typography>
                        <Chip
                          label={selectedCall.status}
                          color={getStatusColor(selectedCall.status)}
                          size="small"
                          icon={getStatusIcon(selectedCall.status)}
                        />
                      </Box>

                      <Box>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Duration
                        </Typography>
                        <Typography variant="body1">
                          {formatDuration(selectedCall.duration)}
                        </Typography>
                      </Box>
                    </Stack>
                  </Paper>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                    <Typography variant="h6" gutterBottom color="primary">
                      Teacher Information
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <PersonIcon sx={{ fontSize: 56, color: 'primary.main' }} />
                      <Box>
                        <Typography variant="h6">
                          {selectedCall.teacher?.username || 'Unknown Teacher'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {selectedCall.teacher?.email || 'No email available'}
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>
                </Grid>

                <Grid item xs={12}>
                  <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                    <Typography variant="h6" gutterBottom color="primary">
                      Timeline
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Stack spacing={2}>
                      <Box>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Call Started
                        </Typography>
                        <Typography variant="body1">
                          {selectedCall.startTime ? format(new Date(selectedCall.startTime), 'EEEE, MMMM d, yyyy \'at\' HH:mm:ss') : 'N/A'}
                        </Typography>
                      </Box>
                      
                      {selectedCall.acceptedAt && (
                        <Box>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            Call Accepted
                          </Typography>
                          <Typography variant="body1">
                            {format(new Date(selectedCall.acceptedAt), 'EEEE, MMMM d, yyyy \'at\' HH:mm:ss')}
                          </Typography>
                        </Box>
                      )}

                      {selectedCall.endTime && (
                        <Box>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            Call Ended
                          </Typography>
                          <Typography variant="body1">
                            {format(new Date(selectedCall.endTime), 'EEEE, MMMM d, yyyy \'at\' HH:mm:ss')}
                          </Typography>
                        </Box>
                      )}
                    </Stack>
                  </Paper>
                </Grid>

                {selectedCall.recording && selectedCall.recording.enabled && (
                  <Grid item xs={12}>
                    <Paper sx={{ p: 2, bgcolor: 'success.50' }}>
                      <Typography variant="h6" gutterBottom color="success.main">
                        Recording Information
                      </Typography>
                      <Divider sx={{ mb: 2 }} />
                      <Typography variant="body2" color="text.secondary">
                        This call was recorded for quality and training purposes. 
                        The recording is securely stored and only accessible by authorized personnel.
                      </Typography>
                      {selectedCall.recording.chunks && selectedCall.recording.chunks.length > 0 && (
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          Recording contains {selectedCall.recording.chunks.length} segment(s)
                        </Typography>
                      )}
                    </Paper>
                  </Grid>
                )}

                {selectedCall.notes && (
                  <Grid item xs={12}>
                    <Paper sx={{ p: 2, bgcolor: 'info.50' }}>
                      <Typography variant="h6" gutterBottom color="info.main">
                        Teacher Notes
                      </Typography>
                      <Divider sx={{ mb: 2 }} />
                      <Typography variant="body1">
                        {selectedCall.notes}
                      </Typography>
                    </Paper>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialogOpen(false)} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CallLogsPage;