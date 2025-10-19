import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  TextField,
  Button,
  Avatar,
  Alert,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  Send as SendIcon,
  Person as PersonIcon,
  AttachFile as AttachFileIcon,
} from '@mui/icons-material';

function Messages({ user, socketManager, apiClient }) {
  const [teacher, setTeacher] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadTeacherAndMessages();

    // Set up socket listeners
    if (socketManager) {
      socketManager.on('message-received', handleNewMessage);
    }

    return () => {
      if (socketManager) {
        socketManager.off('message-received', handleNewMessage);
      }
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadTeacherAndMessages = async () => {
    try {
      setLoading(true);

      // Load assigned teacher
      const teacherResponse = await apiClient.getMyTeacher();
      if (teacherResponse.success && teacherResponse.teacher) {
        setTeacher(teacherResponse.teacher);
        
        // Load conversation with teacher
        await loadMessages(teacherResponse.teacher.id);
      }

    } catch (error) {
      console.error('Failed to load teacher and messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (teacherId) => {
    try {
      // Use the apiClient to load messages
      const response = await apiClient.getMessages();
      if (response.success && response.messages) {
        // Filter messages for conversation with the teacher
        const teacherMessages = response.messages.filter(msg => 
          (msg.sender?.id === teacherId && msg.receiver?.id === user.id) ||
          (msg.sender?.id === user.id && msg.receiver?.id === teacherId)
        ).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        
        setMessages(teacherMessages);
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
      setMessages([]);
    }
  };

  const handleNewMessage = (messageData) => {
    if (teacher && 
        (messageData.senderId === teacher.id || messageData.receiverId === teacher.id)) {
      setMessages(prev => [...prev, messageData]);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !teacher) return;

    try {
      await socketManager.sendMessage(teacher.id, newMessage);

      // Add to local messages for immediate feedback
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        senderId: user.id || user.userId,
        receiverId: teacher.id,
        content: newMessage,
        timestamp: new Date(),
        isRead: false
      }]);

      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="50vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!teacher) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Messages
        </Typography>
        <Alert severity="info">
          No teacher assigned yet. Contact your administrator to get assigned to a teacher.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Messages
      </Typography>

      <Paper sx={{ height: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Box display="flex" alignItems="center">
            <Avatar sx={{ mr: 2 }}>
              <PersonIcon />
            </Avatar>
            <Box>
              <Typography variant="h6">
                {teacher.username}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Your Teacher • {teacher.email}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Messages */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
          {messages.length === 0 ? (
            <Alert severity="info">
              No messages yet. Start a conversation with your teacher!
            </Alert>
          ) : (
            messages.map((message) => {
              const isSent = message.senderId === (user.id || user.userId);
              return (
                <Box
                  key={message.id}
                  sx={{
                    mb: 2,
                    display: 'flex',
                    justifyContent: isSent ? 'flex-end' : 'flex-start',
                  }}
                >
                  <Paper
                    sx={{
                      p: 2,
                      maxWidth: '70%',
                      bgcolor: isSent ? 'primary.light' : 'grey.100',
                      borderRadius: isSent ? '20px 20px 5px 20px' : '20px 20px 20px 5px',
                    }}
                  >
                    <Typography variant="body1">
                      {message.content}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </Typography>
                  </Paper>
                </Box>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </Box>

        {/* Send Message */}
        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            💡 Remember: All messages are monitored by pattern detection for safety. Keep conversations educational and appropriate.
          </Alert>
          <Box display="flex" gap={1}>
            <TextField
              fullWidth
              multiline
              maxRows={3}
              placeholder="Type your message to your teacher..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              variant="outlined"
            />
            <Button
              variant="contained"
              onClick={handleSendMessage}
              disabled={!newMessage.trim()}
              sx={{ minWidth: 'auto', px: 3 }}
            >
              <SendIcon />
            </Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}

export default Messages;