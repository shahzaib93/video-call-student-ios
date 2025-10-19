import React, { useState, useEffect } from 'react';

// Try minimal imports first
// import { Box, ThemeProvider, CssBaseline, Typography, Button } from '@mui/material';
// import { modernTheme } from './theme/modernTheme';

// Capacitor imports for mobile app support
// import { Capacitor } from '@capacitor/core';

function TestApp() {
  
  return (
    <div style={{
      padding: '20px',
      fontFamily: 'Arial, sans-serif',
      maxWidth: '100vw',
      minHeight: '100vh',
      backgroundColor: '#f5f5f5'
    }}>
      <h1>🔧 Minimal Debug Test</h1>
      <p>If you can see this, React is working!</p>
      <p>Platform: {typeof window !== 'undefined' ? 'Web' : 'Unknown'}</p>
      <p>Time: {new Date().toISOString()}</p>
      
      <div style={{
        backgroundColor: 'black',
        color: 'lime',
        padding: '10px',
        fontFamily: 'monospace',
        marginTop: '20px'
      }}>
        <div>✅ React: OK</div>
        <div>✅ DOM: OK</div>
        <div>✅ Styles: OK</div>
        <div>📱 This should work in mobile WebView</div>
      </div>

      <button 
        onClick={() => {
          alert('Button works!');
        }}
        style={{
          marginTop: '20px',
          padding: '10px 20px',
          fontSize: '16px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px'
        }}
      >
        Test Click
      </button>
    </div>
  );
}

export default TestApp;