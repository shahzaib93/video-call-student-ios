import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
// import TestApp from './TestApp';

// Expose React globally for iOS debugging
window.React = React;
window.ReactDOM = ReactDOM;
console.log('✅ React exposed globally:', typeof window.React);

// Add error boundary for debugging - SHOW ERRORS ON SCREEN
let errorCount = 0;
let errorMessages = [];

function showErrorOnScreen() {
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <div style="padding: 20px; background: white; min-height: 100vh; font-family: Arial;">
        <h1 style="color: #e74c3c;">JavaScript Errors Detected (${errorMessages.length})</h1>
        ${errorMessages.map((msg, i) => `
          <div style="margin: 20px 0; padding: 15px; background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px;">
            <h3>Error #${i + 1}</h3>
            <pre style="white-space: pre-wrap; font-size: 12px;">${msg}</pre>
          </div>
        `).join('')}
        <button onclick="window.location.reload()" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
          Reload App
        </button>
      </div>
    `;
  }
}

window.addEventListener('error', (e) => {
  console.error('Global error:', e.error);
  errorCount++;
  const msg = e.error?.message || e.message || 'Unknown error';
  const stack = e.error?.stack || 'No stack trace';
  const file = e.filename || 'Unknown file';
  const line = e.lineno || '?';

  errorMessages.push(`Message: ${msg}\nFile: ${file}:${line}\n\nStack:\n${stack}`);

  setTimeout(() => showErrorOnScreen(), 500);
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled promise rejection:', e.reason);
  errorCount++;

  errorMessages.push(`Promise Rejection:\n${e.reason}\n\n${e.reason?.stack || ''}`);

  setTimeout(() => showErrorOnScreen(), 500);
});

// Create a safe App wrapper that won't crash the entire app
function SafeApp() {
  const [error, setError] = React.useState(null);

  if (error) {
    return (
      <div style={{padding: '20px', fontFamily: 'Arial', backgroundColor: '#fff', minHeight: '100vh'}}>
        <h1 style={{color: '#e74c3c'}}>App Initialization Failed</h1>
        <p><strong>Error:</strong> {error.message}</p>
        <pre style={{background: '#f5f5f5', padding: '10px', overflow: 'auto', fontSize: '12px'}}>
          {error.stack}
        </pre>
        <button onClick={() => window.location.reload()} style={{padding: '10px 20px', marginTop: '20px'}}>
          Reload App
        </button>
      </div>
    );
  }

  try {
    return <App />;
  } catch (err) {
    setError(err);
    return null;
  }
}

try {
  console.log('🔧 Starting React app initialization...');
  const root = document.getElementById('root');
  if (!root) {
    throw new Error('Root element not found!');
  }
  console.log('✅ Root element found');

  console.log('🔧 Creating React root...');
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <HashRouter>
        <SafeApp />
      </HashRouter>
    </React.StrictMode>
  );
  console.log('✅ React app rendered!');
} catch (error) {
  console.error('❌ Failed to render app:', error);
  document.body.innerHTML = `
    <div style="padding: 20px; font-family: sans-serif; background: white; min-height: 100vh;">
      <h1 style="color: #e74c3c;">Fatal Error</h1>
      <p><strong>Error:</strong> ${error.message}</p>
      <pre style="background: #f5f5f5; padding: 10px; overflow: auto;">${error.stack || 'No stack trace'}</pre>
      <button onclick="window.location.reload()" style="padding: 10px 20px; margin-top: 20px;">Reload App</button>
    </div>
  `;
}