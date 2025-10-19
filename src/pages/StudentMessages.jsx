import React, { useState, useEffect, useRef, useCallback } from 'react';
import MessageService from '../services/MessageService';
import UserService from '../services/UserService';
import {
  Box,
  Paper,
  Typography,
  TextField,
  IconButton,
  Avatar,
  Tabs,
  Tab,
  Badge,
  InputAdornment,
  useTheme,
  alpha,
  Chip,
} from '@mui/material';
import {
  Send as SendIcon,
  School as SchoolIcon,
  AdminPanelSettings as AdminIcon,
  Circle as CircleIcon,
  VideoCall as VideoCallIcon,
} from '@mui/icons-material';

// Message Bubble Component
function MessageBubble({ message, isOwn, currentTime = new Date() }) {
  const theme = useTheme();
  
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: isOwn ? 'flex-end' : 'flex-start',
        mb: 2,
      }}
    >
      <Paper
        sx={{
          p: 2,
          maxWidth: '70%',
          borderRadius: 2,
          bgcolor: isOwn 
            ? alpha(theme.palette.primary.main, 0.9)
            : alpha(theme.palette.background.paper, 0.9),
          color: isOwn ? 'white' : 'text.primary',
          boxShadow: `0 2px 8px ${alpha(theme.palette.common.black, 0.1)}`,
        }}
      >
        <Typography variant="body1" sx={{ wordBreak: 'break-word' }}>
          {message.content}
        </Typography>
        <Typography 
          variant="caption" 
          sx={{ 
            display: 'block', 
            mt: 0.5,
            opacity: 0.7,
            fontSize: '0.7rem',
          }}
        >
          {(() => {
            if (!message.timestamp) return 'Unknown time';
            
            const messageDate = message.timestamp instanceof Date ? message.timestamp : new Date(message.timestamp);
            
            if (isNaN(messageDate.getTime())) return 'Unknown time';
            
            const now = currentTime;
            const diffMs = now - messageDate;
            const diffSeconds = Math.floor(diffMs / 1000);
            const diffMinutes = Math.floor(diffSeconds / 60);
            const diffHours = Math.floor(diffMinutes / 60);
            const diffDays = Math.floor(diffHours / 24);
            
            if (diffSeconds < 60) return 'Just now';
            if (diffMinutes < 60) return `${diffMinutes} min${diffMinutes > 1 ? 's' : ''} ago`;
            if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
            if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
            
            return messageDate.toLocaleDateString();
          })()}
        </Typography>
      </Paper>
    </Box>
  );
}

function StudentMessages({ user }) {
  const theme = useTheme();
  const [conversations, setConversations] = useState([]);
  const [selectedTab, setSelectedTab] = useState(0); // 0 = teacher, 1 = admin
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [firebaseConversations, setFirebaseConversations] = useState([]);
  
  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute
    
    return () => clearInterval(timer);
  }, []);

  // Set up real-time Firebase conversations listener
  useEffect(() => {
    let unsubscribe = null;
    
    if (user) {
      
      // Set up real-time conversations listener
      unsubscribe = MessageService.getConversations((firebaseConversations) => {
        setFirebaseConversations(firebaseConversations);
        
        // Load user data to complement Firebase conversations
        loadFirebaseConversations(firebaseConversations);
      });
    }
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user]);

  // Set up real-time messages listener when conversation is selected
  useEffect(() => {
    let unsubscribe = null;
    
    if (conversations[selectedTab]) {
      const selectedConversation = conversations[selectedTab];
      
      // Set up real-time messages listener
      unsubscribe = MessageService.getMessages(selectedConversation.firebaseId || selectedConversation.id, (firebaseMessages) => {
        
        // Transform Firebase messages to match UI format
        const transformedMessages = firebaseMessages.map(msg => ({
          id: msg.id,
          senderId: msg.senderId,
          recipientId: msg.receiverId,
          content: msg.content,
          timestamp: msg.timestamp?.toDate?.() || new Date(msg.createdAt),
          senderName: msg.metadata?.senderName || 'Unknown',
          recipientName: msg.metadata?.receiverName || 'Unknown',
          isOwn: msg.senderId === user.id,
          isRead: msg.isRead
        }));
        
        setMessages(transformedMessages);
        
        // Mark messages as read if this conversation is selected
        MessageService.markAsRead(selectedConversation.firebaseId || selectedConversation.id);
      });
    } else {
      setMessages([]);
    }
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [selectedTab, conversations, user]);
  
  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadFirebaseConversations = async (firebaseConversations) => {
    try {
      const conversationList = [];
      
      if (!user?.id) {
        console.warn('No user ID available for loading conversations');
        return;
      }
      
      // 1. Load assigned teacher
      const teacherResponse = await UserService.getMyTeacher(user.id);
      if (teacherResponse?.success && teacherResponse.teacher) {
        const teacher = teacherResponse.teacher;
        
        // Find Firebase conversation with teacher
        const firebaseConv = firebaseConversations.find(conv => 
          conv.participants.includes(teacher.id)
        );
        
        conversationList.push({
          id: teacher.id,
          firebaseId: firebaseConv?.id,
          user: {
            id: teacher.id,
            name: teacher.username || teacher.name || 'My Teacher',
            avatar: <SchoolIcon />,
            status: teacher.isOnline ? 'online' : 'offline',
            role: 'teacher'
          },
          lastMessage: firebaseConv?.lastMessage || '',
          timestamp: firebaseConv?.lastMessageTime?.toDate?.() || new Date(0),
          unread: firebaseConv?.unreadCount?.[user.id] || 0
        });
      }
      
      // 2. Load admin users
      const usersResponse = await UserService.getUsersByRole('admin');
      if (usersResponse?.success && usersResponse.users?.length > 0) {
        const admin = usersResponse.users[0]; // Get first admin
        
        // Find Firebase conversation with admin
        const firebaseConv = firebaseConversations.find(conv => 
          conv.participants.includes(admin.id)
        );
        
        conversationList.push({
          id: admin.id,
          firebaseId: firebaseConv?.id,
          user: {
            id: admin.id,
            name: admin.username || admin.name || 'Admin',
            avatar: <AdminIcon />,
            status: admin.isOnline ? 'online' : 'offline',
            role: 'admin'
          },
          lastMessage: firebaseConv?.lastMessage || '',
          timestamp: firebaseConv?.lastMessageTime?.toDate?.() || new Date(0),
          unread: firebaseConv?.unreadCount?.[user.id] || 0
        });
      }
      
      setConversations(conversationList);
    } catch (error) {
      console.error('Failed to load Firebase conversations:', error);
    }
  };

  // Removed loadMessages - now using Firebase real-time listener

  const sendMessage = async () => {
    if (!messageInput.trim() || !conversations[selectedTab]) return;

    const messageContent = messageInput.trim();
    const selectedConversation = conversations[selectedTab];

    // Clear input immediately for better UX
    setMessageInput('');

    try {
      // Send message via Firebase
      
      const result = await MessageService.sendMessage(
        selectedConversation.id, 
        messageContent, 
        'text'
      );

      if (result.success) {
        // Message will appear in UI automatically via real-time listener
      } else {
        console.error('❌ Failed to send message via Firebase:', result.error);
        // Restore the input on failure
        setMessageInput(messageContent);
        alert('Failed to send message: ' + result.error);
      }
    } catch (error) {
      console.error('❌ Error sending message via Firebase:', error);
      // Restore the input on failure
      setMessageInput(messageContent);
      alert('Failed to send message: ' + error.message);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
  };

  return (
    <Box sx={{
      height: 'calc(100vh - 112px)', // Viewport minus layout offset
      display: 'flex',
      flexDirection: 'column',
      bgcolor: 'background.default',
      overflow: 'hidden',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
    }}>
      {/* Main Messages Container */}
      <Box sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
        borderRadius: 2,
        bgcolor: alpha(theme.palette.background.paper, 0.3),
        overflow: 'hidden'
      }}>
        {/* Header with Tabs */}
        <Paper
          elevation={0}
          sx={{
            flexShrink: 0, // Prevent header from shrinking
            borderRadius: '8px 8px 0 0', // Rounded top corners only
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.95)} 0%, ${alpha(theme.palette.background.paper, 0.9)} 100%)`,
          }}
        >
        <Box sx={{ px: 3 }}>
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            Messages
          </Typography>
        </Box>
        
        <Tabs
          value={selectedTab}
          onChange={handleTabChange}
          sx={{
            px: 2,
            '& .MuiTab-root': {
              minHeight: 64,
              textTransform: 'none',
              fontSize: '1rem',
              fontWeight: 500,
            },
          }}
        >
          {conversations.map((conv, index) => (
            <Tab
              key={conv.id}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Badge
                    badgeContent={conv.unread}
                    color="error"
                    sx={{
                      '& .MuiBadge-badge': {
                        fontSize: '0.7rem',
                      }
                    }}
                  >
                    <Avatar 
                      sx={{ 
                        width: 32, 
                        height: 32,
                        bgcolor: conv.user.role === 'teacher' 
                          ? theme.palette.secondary.main 
                          : theme.palette.primary.main 
                      }}
                    >
                      {conv.user.avatar}
                    </Avatar>
                  </Badge>
                  <Box sx={{ textAlign: 'left' }}>
                    <Typography variant="body1">
                      {conv.user.name}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <CircleIcon 
                        sx={{ 
                          fontSize: 8, 
                          color: conv.user.status === 'online' 
                            ? theme.palette.success.main 
                            : theme.palette.text.disabled
                        }} 
                      />
                      <Typography variant="caption" color="text.secondary">
                        {conv.user.status === 'online' ? 'Online' : 'Offline'}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              }
            />
          ))}
        </Tabs>
        </Paper>

        {/* Chat Area */}
        {conversations[selectedTab] && (
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Messages Area */}
          <Box
            sx={{
              flex: 1,
              overflow: 'auto',
              p: 3,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {messages.length === 0 ? (
              <Box
                sx={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'text.secondary',
                }}
              >
                <Typography variant="body1">
                  Start a conversation with {conversations[selectedTab].user.name}
                </Typography>
              </Box>
            ) : (
              <>
                {messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    isOwn={message.isOwn}
                    currentTime={currentTime}
                  />
                ))}
              </>
            )}
            <div ref={messagesEndRef} />
          </Box>

          {/* Message Input */}
          <Box
            sx={{
              flexShrink: 0,
              p: 2,
              pb: 3, // Extra bottom padding for spacing
              borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              bgcolor: alpha(theme.palette.background.paper, 0.1),
            }}
          >
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
              <TextField
                fullWidth
                multiline
                maxRows={4}
                placeholder={`Message ${conversations[selectedTab].user.name}...`}
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyPress={handleKeyPress}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                    backgroundColor: alpha(theme.palette.background.default, 0.5),
                  },
                }}
              />
              <IconButton
                onClick={sendMessage}
                disabled={!messageInput.trim()}
                sx={{
                  bgcolor: theme.palette.primary.main,
                  color: 'white',
                  '&:hover': {
                    bgcolor: theme.palette.primary.dark,
                  },
                  '&:disabled': {
                    bgcolor: alpha(theme.palette.primary.main, 0.3),
                  },
                  width: 48,
                  height: 48,
                }}
              >
                <SendIcon />
              </IconButton>
            </Box>
          </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}

export default StudentMessages;