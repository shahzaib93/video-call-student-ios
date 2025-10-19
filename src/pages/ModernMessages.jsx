import React, { useState, useEffect, useRef } from 'react';
import { useCache } from '../contexts/CacheContext';
import { API_BASE_URL } from '../config/environment';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  TextField,
  IconButton,
  Chip,
  Badge,
  InputAdornment,
  Divider,
  useTheme,
  alpha,
  CircularProgress,
} from '@mui/material';
import {
  Send as SendIcon,
  Search as SearchIcon,
  AttachFile as AttachFileIcon,
  EmojiEmotions as EmojiIcon,
  VideoCall as VideoCallIcon,
  Phone as PhoneIcon,
  Circle as CircleIcon,
  School as SchoolIcon,
  AdminPanelSettings as AdminIcon,
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
          backgroundColor: isOwn 
            ? theme.palette.primary.main 
            : alpha(theme.palette.background.paper, 0.8),
          color: isOwn ? theme.palette.primary.contrastText : theme.palette.text.primary,
          borderRadius: isOwn ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          backdropFilter: 'blur(10px)',
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        }}
      >
        <Typography variant="body2">
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
            
            // WhatsApp-like relative time display
            if (diffSeconds < 10) {
              return 'Now';
            } else if (diffSeconds < 60) {
              return `${diffSeconds}s ago`;
            } else if (diffMinutes < 60) {
              return `${diffMinutes}m ago`;
            } else if (diffHours < 24) {
              return `${diffHours}h ago`;
            } else if (diffDays === 1) {
              return 'Yesterday';
            } else if (diffDays < 7) {
              return `${diffDays}d ago`;
            } else {
              return messageDate.toLocaleDateString([], { 
                month: 'short', 
                day: 'numeric'
              });
            }
          })()}
        </Typography>
      </Paper>
    </Box>
  );
}

function ModernMessages({ user, socketManager, apiClient }) {
  const theme = useTheme();
  const cache = useCache();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Auto-scroll to bottom function
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  // Update current time every minute for relative timestamps
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute
    
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadConversations();
    
    // Listen for real-time message updates
    const handleMessageReceived = (event) => {
      const messageData = event.detail;
      
      // Add the new message to the current messages if it's for the selected conversation
      if (selectedConversation && 
          (messageData.senderId === selectedConversation.id || 
           messageData.recipientId === selectedConversation.id)) {
        const newMessage = {
          id: messageData.id || Date.now(),
          content: messageData.content,
          timestamp: new Date(messageData.timestamp),
          isOwn: messageData.senderId === user.id,
          senderId: messageData.senderId,
          recipientId: messageData.recipientId,
        };
        setMessages(prev => [...prev, newMessage]);
      }
      
      // Don't reload conversations - just update the conversation list with the new message
      setConversations(prev => {
        return prev.map(conv => {
          if (conv.id === messageData.senderId || conv.id === messageData.recipientId) {
            // Update conversation with new message
            const updatedConv = { ...conv };
            if (!updatedConv.messages) {
              updatedConv.messages = [];
            }
            updatedConv.messages.push({
              ...messageData,
              timestamp: new Date(messageData.timestamp)
            });
            updatedConv.lastMessage = messageData.content;
            updatedConv.timestamp = new Date(messageData.timestamp);
            if (messageData.senderId !== user.id) {
              updatedConv.unread = (updatedConv.unread || 0) + 1;
            }
            return updatedConv;
          }
          return conv;
        });
      });
    };
    
    window.addEventListener('message-received', handleMessageReceived);
    
    return () => {
      window.removeEventListener('message-received', handleMessageReceived);
    };
  }, [selectedConversation, user.id]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
    }
  }, [selectedConversation]);
  
  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadConversations = async () => {
    try {
      const conversationMap = new Map();
      
      // 1. Load teacher (students have one assigned teacher)
      const teacherResponse = await cache.getMyTeacher();
      if (teacherResponse?.success && teacherResponse.teacher) {
        const teacher = teacherResponse.teacher;
        conversationMap.set(teacher.id, {
          id: teacher.id,
          user: {
            id: teacher.id,
            name: teacher.username || teacher.name || 'My Teacher',
            avatar: <SchoolIcon />,
            status: teacher.isOnline ? 'online' : 'offline',
            role: 'teacher'
          },
          lastMessage: '',
          timestamp: new Date(0),
          unread: 0,
          messages: []
        });
      }
      
      // 2. Load admin (students can message admin)
      const usersResponse = await cache.getUsers();
      if (usersResponse?.success && usersResponse.users) {
        const admins = usersResponse.users.filter(u => u.role === 'admin');
        admins.forEach(admin => {
          conversationMap.set(admin.id, {
            id: admin.id,
            user: {
              id: admin.id,
              name: admin.username || admin.name || 'Admin',
              avatar: <AdminIcon />,
              status: admin.isOnline ? 'online' : 'offline',
              role: 'admin'
            },
            lastMessage: '',
            timestamp: new Date(0),
            unread: 0,
            messages: []
          });
        });
      }
      
      // 3. Load messages
      const messagesResponse = await cache.getMyMessages();
      if (messagesResponse?.success && messagesResponse.messages) {
        messagesResponse.messages.forEach(message => {
          const conversationPartnerId = message.senderId === user.id ? message.recipientId : message.senderId;
          if (!conversationPartnerId) return;
          
          // Parse message timestamp
          let messageTime;
          if (message.timestamp) {
            if (message.timestamp.toDate && typeof message.timestamp.toDate === 'function') {
              messageTime = message.timestamp.toDate();
            } else if (message.timestamp._seconds && typeof message.timestamp._seconds === 'number') {
              messageTime = new Date(message.timestamp._seconds * 1000);
            } else if (message.timestamp.seconds && typeof message.timestamp.seconds === 'number') {
              messageTime = new Date(message.timestamp.seconds * 1000);
            } else {
              messageTime = new Date(message.timestamp);
            }
          } else if (message.createdAt) {
            if (message.createdAt._seconds && typeof message.createdAt._seconds === 'number') {
              messageTime = new Date(message.createdAt._seconds * 1000);
            } else if (message.createdAt.seconds && typeof message.createdAt.seconds === 'number') {
              messageTime = new Date(message.createdAt.seconds * 1000);
            } else {
              messageTime = new Date(message.createdAt);
            }
          } else {
            messageTime = new Date(0);
          }
          
          if (conversationMap.has(conversationPartnerId)) {
            const conversation = conversationMap.get(conversationPartnerId);
            conversation.messages.push({
              ...message,
              timestamp: messageTime
            });
            
            // Update last message and timestamp
            if (messageTime > conversation.timestamp) {
              conversation.lastMessage = message.content;
              conversation.timestamp = messageTime;
            }
            
            // Update unread count
            if (!message.read && message.senderId !== user.id) {
              conversation.unread++;
            }
          }
        });
      }
      
      const conversationsList = Array.from(conversationMap.values())
        .filter(conv => conv.user)
        .sort((a, b) => b.timestamp - a.timestamp);
      
      setConversations(conversationsList);
      
      // If no conversation selected but have conversations, select first one
      if (!selectedConversation && conversationsList.length > 0) {
        setSelectedConversation(conversationsList[0]);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  const loadMessages = async (conversationId) => {
    if (!selectedConversation) return;
    
    const conversationMessages = selectedConversation.messages.map(message => {
      let msgTime = message.timestamp instanceof Date ? message.timestamp : new Date(message.timestamp || 0);
      
      return {
        id: message.id,
        content: message.content,
        timestamp: msgTime,
        isOwn: message.senderId === user.id,
        senderId: message.senderId,
        recipientId: message.recipientId,
      };
    }).sort((a, b) => a.timestamp - b.timestamp);
    
    setMessages(conversationMessages);
  };

  const sendMessage = async () => {
    if (!messageInput.trim() || !selectedConversation) return;

    const messageContent = messageInput.trim();
    const newMessage = {
      id: Date.now(),
      content: messageContent,
      timestamp: new Date(),
      isOwn: true,
      senderId: user.id,
      recipientId: selectedConversation.id,
    };

    // Optimistically add message to UI
    setMessages(prev => [...prev, newMessage]);
    setMessageInput('');

    try {
      // Send via API
      const response = await fetch(`${API_BASE_URL}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          receiverId: selectedConversation.id,
          content: messageContent,
          type: 'text'
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to send message');
      }

      // Send via socket for real-time delivery
      if (socketManager) {
        socketManager.sendMessage({
          recipientId: selectedConversation.id,
          content: messageContent,
          timestamp: new Date()
        });
      }

      // Update the conversation with the sent message
      setConversations(prev => prev.map(conv => {
        if (conv.id === selectedConversation.id) {
          const updatedConv = { ...conv };
          if (!updatedConv.messages) {
            updatedConv.messages = [];
          }
          updatedConv.messages.push(newMessage);
          updatedConv.lastMessage = messageContent;
          updatedConv.timestamp = new Date();
          return updatedConv;
        }
        return conv;
      }));
    } catch (error) {
      console.error('Send message error:', error);
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== newMessage.id));
      alert('Failed to send message');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', bgcolor: 'background.default' }}>
      {/* Conversations Sidebar */}
      <Paper
        sx={{
          width: 320,
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 0,
          borderRight: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.8)} 0%, ${alpha(theme.palette.background.paper, 0.6)} 100%)`,
          backdropFilter: 'blur(20px)',
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            Messages
          </Typography>
          <TextField
            fullWidth
            placeholder="Search conversations..."
            size="small"
            disabled
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 3,
                backgroundColor: alpha(theme.palette.background.default, 0.5),
              },
            }}
          />
        </Box>

        <Divider sx={{ opacity: 0.1 }} />

        {/* Conversations List */}
        <List sx={{ flex: 1, overflow: 'auto', py: 1 }}>
          {conversations.map((conversation) => (
            <ListItem
              key={conversation.id}
              button
              selected={selectedConversation?.id === conversation.id}
              onClick={() => setSelectedConversation(conversation)}
              sx={{
                borderRadius: 2,
                mb: 1,
                mx: 1,
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.08),
                },
                '&.Mui-selected': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.15),
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.2),
                  },
                },
              }}
            >
              <ListItemAvatar>
                <Badge
                  overlap="circular"
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  badgeContent={
                    <CircleIcon 
                      sx={{ 
                        fontSize: 12, 
                        color: conversation.user.status === 'online' 
                          ? theme.palette.success.main 
                          : theme.palette.text.disabled,
                        filter: 'drop-shadow(0px 0px 2px rgba(0,0,0,0.5))',
                      }} 
                    />
                  }
                >
                  <Avatar sx={{ 
                    bgcolor: conversation.user.role === 'teacher' 
                      ? theme.palette.secondary.main 
                      : theme.palette.primary.main 
                  }}>
                    {conversation.user.avatar}
                  </Avatar>
                </Badge>
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle2" fontWeight="medium">
                      {conversation.user.name}
                    </Typography>
                    <Chip 
                      label={conversation.user.role}
                      size="small"
                      sx={{ 
                        height: 18,
                        fontSize: '0.65rem',
                        textTransform: 'capitalize',
                      }}
                      color={conversation.user.role === 'teacher' ? 'secondary' : 'primary'}
                    />
                  </Box>
                }
                secondary={
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography 
                      variant="body2" 
                      color="text.secondary"
                      sx={{ 
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: '200px',
                      }}
                    >
                      {conversation.lastMessage || 'No messages yet'}
                    </Typography>
                    {conversation.unread > 0 && (
                      <Chip
                        label={conversation.unread}
                        size="small"
                        color="primary"
                        sx={{ 
                          fontSize: '0.75rem',
                          height: 20,
                          minWidth: 20,
                          '& .MuiChip-label': { px: 0.5 },
                        }}
                      />
                    )}
                  </Box>
                }
              />
            </ListItem>
          ))}
        </List>
      </Paper>

      {/* Message Area */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <Paper
              sx={{
                p: 2,
                borderRadius: 0,
                borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(theme.palette.background.paper, 0.7)} 100%)`,
                backdropFilter: 'blur(20px)',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ 
                    bgcolor: selectedConversation.user.role === 'teacher' 
                      ? theme.palette.secondary.main 
                      : theme.palette.primary.main 
                  }}>
                    {selectedConversation.user.avatar}
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {selectedConversation.user.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {selectedConversation.user.status === 'online' ? 'Online' : 'Offline'}
                    </Typography>
                  </Box>
                </Box>
                <Box>
                  <IconButton size="small" disabled>
                    <PhoneIcon />
                  </IconButton>
                  <IconButton size="small" disabled>
                    <VideoCallIcon />
                  </IconButton>
                </Box>
              </Box>
            </Paper>

            {/* Messages */}
            <Box
              sx={{
                flex: 1,
                overflow: 'auto',
                p: 2,
                background: `url("data:image/svg+xml,%3Csvg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.02"%3E%3Ccircle cx="20" cy="20" r="1"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }}
            >
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isOwn={message.isOwn}
                  currentTime={currentTime}
                />
              ))}
              <div ref={messagesEndRef} />
            </Box>

            {/* Message Input */}
            <Box
              sx={{
                p: 2,
                borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.8)} 0%, ${alpha(theme.palette.background.paper, 0.6)} 100%)`,
                backdropFilter: 'blur(20px)',
              }}
            >
              <TextField
                fullWidth
                multiline
                maxRows={4}
                placeholder="Type a message..."
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyPress={handleKeyPress}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <IconButton size="small" disabled>
                        <AttachFileIcon />
                      </IconButton>
                      <IconButton size="small" disabled>
                        <EmojiIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton 
                        color="primary" 
                        onClick={sendMessage}
                        disabled={!messageInput.trim()}
                      >
                        <SendIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                  sx: {
                    borderRadius: 3,
                    backgroundColor: alpha(theme.palette.background.default, 0.5),
                  },
                }}
              />
            </Box>
          </>
        ) : (
          <Box sx={{ 
            flex: 1, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 2,
            color: 'text.secondary',
          }}>
            {loading ? (
              <>
                <CircularProgress />
                <Typography>Loading conversations...</Typography>
              </>
            ) : (
              <>
                <SchoolIcon sx={{ fontSize: 64, opacity: 0.5 }} />
                <Typography variant="h6">Select a conversation to start messaging</Typography>
              </>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
}

export default ModernMessages;