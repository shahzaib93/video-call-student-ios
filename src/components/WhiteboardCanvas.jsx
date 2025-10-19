import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Box,
  IconButton,
  Paper,
  Tooltip,
  ButtonGroup,
  Slider,
  Typography,
  Popover,
  Grid,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import {
  Brush as BrushIcon,
  Create as PenIcon,
  Clear as ClearIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
  Circle as CircleIcon,
  CropSquare as RectIcon,
  Timeline as LineIcon,
  TextFields as TextIcon,
  ColorLens as ColorIcon,
  Close as CloseIcon,
  AutoFixHigh as EraserIcon,
} from '@mui/icons-material';

const WhiteboardCanvas = ({ 
  socketManager, 
  isVisible, 
  onClose, 
  callId, 
  isTeacher = false 
}) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTool, setCurrentTool] = useState('pen');
  const [currentColor, setCurrentColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(3);
  const [startPoint, setStartPoint] = useState(null);
  const [colorAnchorEl, setColorAnchorEl] = useState(null);
  const [drawingHistory, setDrawingHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [textInput, setTextInput] = useState('');
  const [textPosition, setTextPosition] = useState(null);
  const [isAddingText, setIsAddingText] = useState(false);

  const colors = [
    '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF',
    '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080',
    '#FFC0CB', '#A52A2A', '#808080', '#000080', '#008000'
  ];

  const tools = [
    { id: 'pen', icon: <PenIcon />, label: 'Pen (Precise)' },
    { id: 'brush', icon: <BrushIcon />, label: 'Brush (Thick)' },
    { id: 'eraser', icon: <EraserIcon />, label: 'Eraser' },
    { id: 'line', icon: <LineIcon />, label: 'Line' },
    { id: 'rectangle', icon: <RectIcon />, label: 'Rectangle' },
    { id: 'circle', icon: <CircleIcon />, label: 'Circle' },
    { id: 'text', icon: <TextIcon />, label: 'Text' },
  ];

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    // Set canvas background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Save initial state
    saveToHistory();
  }, [isVisible]);

  // Socket event listeners for real-time drawing
  useEffect(() => {
    if (!socketManager?.socket) {
      return;
    }


    const handleDrawingEvent = (data) => {
      if (data.callId === callId) {
        drawOnCanvas(data);
      } else {
      }
    };

    const handleClearCanvas = (data) => {
      if (data.callId === callId) {
        clearCanvas(false);
      } else {
      }
    };

    socketManager.socket.on('whiteboard-draw', handleDrawingEvent);
    socketManager.socket.on('whiteboard-clear', handleClearCanvas);


    return () => {
      socketManager.socket.off('whiteboard-draw', handleDrawingEvent);
      socketManager.socket.off('whiteboard-clear', handleClearCanvas);
    };
  }, [socketManager, callId]);

  const saveToHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const imageData = canvas.toDataURL();
    const newHistory = drawingHistory.slice(0, historyIndex + 1);
    newHistory.push(imageData);
    setDrawingHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      restoreFromHistory(drawingHistory[newIndex]);
    }
  };

  const redo = () => {
    if (historyIndex < drawingHistory.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      restoreFromHistory(drawingHistory[newIndex]);
    }
  };

  const restoreFromHistory = (imageData) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
    img.src = imageData;
  };

  const getCanvasCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const drawOnCanvas = (drawData) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    ctx.strokeStyle = drawData.color;
    ctx.lineWidth = drawData.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    switch (drawData.tool) {
      case 'pen':
        ctx.globalCompositeOperation = 'source-over';
        if (drawData.type === 'start') {
          ctx.beginPath();
          ctx.moveTo(drawData.x, drawData.y);
        } else if (drawData.type === 'draw') {
          ctx.lineTo(drawData.x, drawData.y);
          ctx.stroke();
        }
        break;
        
      case 'brush':
        ctx.globalCompositeOperation = 'source-over';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        if (drawData.type === 'start') {
          ctx.beginPath();
          ctx.moveTo(drawData.x, drawData.y);
        } else if (drawData.type === 'draw') {
          ctx.lineTo(drawData.x, drawData.y);
          ctx.stroke();
        }
        break;
        
      case 'eraser':
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        if (drawData.type === 'start') {
          ctx.beginPath();
          ctx.moveTo(drawData.x, drawData.y);
        } else if (drawData.type === 'draw') {
          ctx.lineTo(drawData.x, drawData.y);
          ctx.stroke();
        }
        break;
        
      case 'line':
        if (drawData.type === 'complete') {
          ctx.beginPath();
          ctx.moveTo(drawData.startX, drawData.startY);
          ctx.lineTo(drawData.endX, drawData.endY);
          ctx.stroke();
        }
        break;
        
      case 'rectangle':
        if (drawData.type === 'complete') {
          ctx.beginPath();
          ctx.rect(drawData.x, drawData.y, drawData.width, drawData.height);
          ctx.stroke();
        }
        break;
        
      case 'circle':
        ctx.globalCompositeOperation = 'source-over';
        if (drawData.type === 'complete') {
          ctx.beginPath();
          ctx.arc(drawData.x, drawData.y, drawData.radius, 0, 2 * Math.PI);
          ctx.stroke();
        }
        break;
        
      case 'text':
        ctx.globalCompositeOperation = 'source-over';
        if (drawData.type === 'complete') {
          ctx.font = `${drawData.fontSize || 16}px Arial`;
          ctx.fillStyle = drawData.color;
          ctx.fillText(drawData.text, drawData.x, drawData.y);
        }
        break;
    }
  };

  const broadcastDrawing = (drawData) => {
    if (!socketManager?.socket) {
      console.error('🎨 Student Whiteboard: Cannot broadcast - no socket available');
      return;
    }

    if (!socketManager.socket.connected) {
      console.error('🎨 Student Whiteboard: Cannot broadcast - socket not connected');
      return;
    }

    const broadcastData = {
      ...drawData,
      callId: callId,
      senderId: socketManager.socket.userData?.userId || 'student',
      senderName: socketManager.socket.userData?.username || 'Student'
    };

    socketManager.socket.emit('whiteboard-draw', broadcastData);
  };

  const handleMouseDown = (e) => {
    const coords = getCanvasCoordinates(e);
    setIsDrawing(true);
    setStartPoint(coords);

    if (currentTool === 'text') {
      setTextPosition(coords);
      setIsAddingText(true);
    } else if (currentTool === 'pen' || currentTool === 'brush' || currentTool === 'eraser') {
      const drawData = {
        type: 'start',
        tool: currentTool,
        x: coords.x,
        y: coords.y,
        color: currentTool === 'eraser' ? '#FFFFFF' : currentColor,
        lineWidth: currentTool === 'brush' ? lineWidth * 3 : 
                   currentTool === 'eraser' ? lineWidth * 2 : lineWidth
      };
      drawOnCanvas(drawData);
      broadcastDrawing(drawData);
    }
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;
    
    const coords = getCanvasCoordinates(e);

    if (currentTool === 'pen' || currentTool === 'brush' || currentTool === 'eraser') {
      const drawData = {
        type: 'draw',
        tool: currentTool,
        x: coords.x,
        y: coords.y,
        color: currentTool === 'eraser' ? '#FFFFFF' : currentColor,
        lineWidth: currentTool === 'brush' ? lineWidth * 3 : 
                   currentTool === 'eraser' ? lineWidth * 2 : lineWidth
      };
      drawOnCanvas(drawData);
      broadcastDrawing(drawData);
    }
  };

  const handleMouseUp = (e) => {
    if (!isDrawing) return;
    
    const coords = getCanvasCoordinates(e);
    setIsDrawing(false);

    if (currentTool === 'line') {
      const drawData = {
        type: 'complete',
        tool: 'line',
        startX: startPoint.x,
        startY: startPoint.y,
        endX: coords.x,
        endY: coords.y,
        color: currentColor,
        lineWidth: lineWidth
      };
      drawOnCanvas(drawData);
      broadcastDrawing(drawData);
    } else if (currentTool === 'rectangle') {
      const drawData = {
        type: 'complete',
        tool: 'rectangle',
        x: Math.min(startPoint.x, coords.x),
        y: Math.min(startPoint.y, coords.y),
        width: Math.abs(coords.x - startPoint.x),
        height: Math.abs(coords.y - startPoint.y),
        color: currentColor,
        lineWidth: lineWidth
      };
      drawOnCanvas(drawData);
      broadcastDrawing(drawData);
    } else if (currentTool === 'circle') {
      const radius = Math.sqrt(
        Math.pow(coords.x - startPoint.x, 2) + Math.pow(coords.y - startPoint.y, 2)
      );
      const drawData = {
        type: 'complete',
        tool: 'circle',
        x: startPoint.x,
        y: startPoint.y,
        radius: radius,
        color: currentColor,
        lineWidth: lineWidth
      };
      drawOnCanvas(drawData);
      broadcastDrawing(drawData);
    }

    saveToHistory();
    setStartPoint(null);
  };

  const clearCanvas = (broadcast = true) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if (broadcast && socketManager?.socket) {
      const clearData = {
        callId: callId,
        senderId: socketManager.socket.userData?.userId || 'student',
        senderName: socketManager.socket.userData?.username || 'Student'
      };
      socketManager.socket.emit('whiteboard-clear', clearData);
    }
    
    saveToHistory();
  };

  const handleTextSubmit = () => {
    if (textInput.trim() && textPosition) {
      const drawData = {
        type: 'complete',
        tool: 'text',
        x: textPosition.x,
        y: textPosition.y,
        text: textInput.trim(),
        color: currentColor,
        fontSize: lineWidth + 12
      };
      drawOnCanvas(drawData);
      broadcastDrawing(drawData);
      saveToHistory();
    }
    setTextInput('');
    setTextPosition(null);
    setIsAddingText(false);
  };

  const handleTextCancel = () => {
    setTextInput('');
    setTextPosition(null);
    setIsAddingText(false);
  };

  const handleColorClick = (event) => {
    setColorAnchorEl(event.currentTarget);
  };

  const handleColorClose = () => {
    setColorAnchorEl(null);
  };

  if (!isVisible) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Toolbar */}
      <Paper
        elevation={3}
        sx={{
          m: 2,
          p: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          flexWrap: 'wrap',
        }}
      >
        {/* Tools */}
        <ButtonGroup size="small">
          {tools.map((tool) => (
            <Tooltip key={tool.id} title={tool.label}>
              <IconButton
                onClick={() => setCurrentTool(tool.id)}
                sx={{
                  backgroundColor: currentTool === tool.id ? 'primary.main' : 'transparent',
                  color: currentTool === tool.id ? 'white' : 'inherit',
                }}
              >
                {tool.icon}
              </IconButton>
            </Tooltip>
          ))}
        </ButtonGroup>

        {/* Color Picker */}
        <Tooltip title="Colors">
          <IconButton
            onClick={handleColorClick}
            sx={{
              backgroundColor: currentColor,
              border: '2px solid #ccc',
              width: 40,
              height: 40,
            }}
          >
            <ColorIcon sx={{ color: currentColor === '#FFFFFF' ? '#000' : '#fff' }} />
          </IconButton>
        </Tooltip>

        <Popover
          open={Boolean(colorAnchorEl)}
          anchorEl={colorAnchorEl}
          onClose={handleColorClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        >
          <Box sx={{ p: 1 }}>
            <Grid container spacing={1} sx={{ width: 180 }}>
              {colors.map((color) => (
                <Grid item xs={3} key={color}>
                  <Box
                    onClick={() => {
                      setCurrentColor(color);
                      handleColorClose();
                    }}
                    sx={{
                      width: 30,
                      height: 30,
                      backgroundColor: color,
                      border: color === currentColor ? '3px solid #2196f3' : '1px solid #ccc',
                      cursor: 'pointer',
                      borderRadius: 1,
                    }}
                  />
                </Grid>
              ))}
            </Grid>
          </Box>
        </Popover>

        {/* Line Width */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 120 }}>
          <Typography variant="caption">Size:</Typography>
          <Slider
            value={lineWidth}
            onChange={(e, value) => setLineWidth(value)}
            min={1}
            max={20}
            size="small"
            sx={{ width: 80 }}
          />
        </Box>

        {/* Actions */}
        <ButtonGroup size="small">
          <Tooltip title="Undo">
            <span>
              <IconButton onClick={undo} disabled={historyIndex <= 0}>
                <UndoIcon />
              </IconButton>
            </span>
          </Tooltip>
          
          <Tooltip title="Redo">
            <span>
              <IconButton onClick={redo} disabled={historyIndex >= drawingHistory.length - 1}>
                <RedoIcon />
              </IconButton>
            </span>
          </Tooltip>
          
          <Tooltip title="Clear All">
            <IconButton onClick={() => clearCanvas(true)}>
              <ClearIcon />
            </IconButton>
          </Tooltip>
        </ButtonGroup>

        {/* Close Button */}
        <Tooltip title="Close Whiteboard">
          <IconButton onClick={onClose} sx={{ ml: 'auto' }}>
            <CloseIcon />
          </IconButton>
        </Tooltip>
      </Paper>

      {/* Canvas */}
      <Box
        sx={{
          flex: 1,
          m: 2,
          mt: 0,
          position: 'relative',
        }}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => setIsDrawing(false)}
          style={{
            width: '100%',
            height: '100%',
            border: '2px solid #ccc',
            borderRadius: '8px',
            backgroundColor: 'white',
            cursor: currentTool === 'pen' ? 'crosshair' : 
                   currentTool === 'brush' ? 'crosshair' :
                   currentTool === 'eraser' ? 'crosshair' :
                   currentTool === 'text' ? 'text' : 'crosshair'
          }}
        />
      </Box>

      {/* Text Input Dialog */}
      <Dialog open={isAddingText} onClose={handleTextCancel} maxWidth="sm" fullWidth>
        <DialogTitle>Add Text</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            multiline
            rows={3}
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Enter text to add to whiteboard..."
            variant="outlined"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleTextSubmit();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleTextCancel}>Cancel</Button>
          <Button onClick={handleTextSubmit} variant="contained" disabled={!textInput.trim()}>
            Add Text
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WhiteboardCanvas;