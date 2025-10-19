import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  TextField,
  Chip,
  Tooltip,
} from '@mui/material';
import {
  Mic as MicIcon,
  MicOff as MicOffIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';

/**
 * Simple Speech-to-Text Component
 * Uses browser's built-in Web Speech API
 */
const SimpleSpeechToText = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState('');

  const recognitionRef = useRef(null);

  useEffect(() => {
    // Check if browser supports speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      setIsSupported(true);
      
      // Create recognition instance
      const recognition = new SpeechRecognition();
      
      // Configure recognition
      recognition.continuous = true; // Keep listening
      recognition.interimResults = true; // Show interim results
      recognition.lang = 'en-US'; // Language
      
      // Handle results
      recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        // Process all results
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0].transcript;
          
          if (result.isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }
        
        // Update state
        if (finalTranscript) {
          setTranscript(prev => prev + finalTranscript);
        }
        setInterimTranscript(interimTranscript);
      };
      
      // Handle errors
      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setError(`Error: ${event.error}`);
        setIsListening(false);
      };
      
      // Handle end
      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript('');
      };
      
      recognitionRef.current = recognition;
    } else {
      setIsSupported(false);
      setError('Speech recognition not supported in this browser');
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const startListening = () => {
    if (recognitionRef.current && isSupported) {
      setError('');
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const clearTranscript = () => {
    setTranscript('');
    setInterimTranscript('');
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  if (!isSupported) {
    return (
      <Paper sx={{ p: 3, m: 2 }}>
        <Typography color="error">
          ❌ Speech recognition is not supported in this browser.
          <br />
          Try using Chrome, Edge, or Safari.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper 
      elevation={3}
      sx={{ 
        position: 'fixed',
        top: 20,
        right: 20,
        width: 400,
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1000,
      }}
    >
      {/* Header */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        p: 2,
        borderBottom: 1,
        borderColor: 'divider',
        backgroundColor: 'secondary.main',
        color: 'white',
      }}>
        <Typography variant="h6" fontWeight={600}>
          🎤 Student Speech to Text
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip 
            label={isListening ? 'Listening' : 'Stopped'}
            size="small"
            color={isListening ? 'success' : 'default'}
            variant="outlined"
            sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)' }}
          />
          
          <Tooltip title="Clear transcript">
            <IconButton 
              size="small" 
              onClick={clearTranscript}
              sx={{ color: 'white' }}
            >
              <ClearIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Controls */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        p: 2,
        backgroundColor: 'grey.50',
      }}>
        <Tooltip title={isListening ? 'Stop listening' : 'Start listening'}>
          <IconButton
            onClick={toggleListening}
            size="large"
            sx={{
              width: 60,
              height: 60,
              backgroundColor: isListening ? 'error.main' : 'success.main',
              color: 'white',
              '&:hover': {
                backgroundColor: isListening ? 'error.dark' : 'success.dark',
              },
            }}
          >
            {isListening ? <MicOffIcon /> : <MicIcon />}
          </IconButton>
        </Tooltip>
      </Box>

      {/* Transcript Display */}
      <Box sx={{ flex: 1, p: 2 }}>
        <TextField
          multiline
          fullWidth
          minRows={8}
          maxRows={15}
          value={transcript + interimTranscript}
          placeholder={isListening ? "Start speaking..." : "Click the microphone to start"}
          variant="outlined"
          InputProps={{
            readOnly: true,
            style: {
              fontSize: '14px',
              lineHeight: '1.5',
            }
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              backgroundColor: 'white',
            },
            '& .MuiInputBase-input': {
              color: interimTranscript ? 'text.secondary' : 'text.primary',
              fontStyle: interimTranscript ? 'italic' : 'normal',
            }
          }}
        />
        
        {/* Status Messages */}
        {error && (
          <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
            {error}
          </Typography>
        )}
        
        {isListening && (
          <Typography variant="caption" color="success.main" sx={{ mt: 1, display: 'block' }}>
            🎵 Listening... Speak clearly into your microphone
          </Typography>
        )}
        
        {transcript && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            📝 {transcript.split(' ').length} words transcribed
          </Typography>
        )}
      </Box>
    </Paper>
  );
};

export default SimpleSpeechToText;