import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
// import TestApp from './TestApp';

// Helper to show messages on screen (iOS debugging)
function showStatus(msg) {
  console.log(msg);
  const el = document.getElementById('status');
  if (el) {
    el.innerHTML = msg;
  }
}

// Expose React globally for iOS debugging
window.React = React;
window.ReactDOM = ReactDOM;
window.TarteelApp = true;
window.StudentAppRenderState = {
  renderStarted: false,
  renderSucceeded: false,
  lastError: null
};
showStatus('✅ React imported and exposed globally');

// Add error boundary for debugging - SHOW ERRORS ON SCREEN
let errorCount = 0;
let errorMessages = [];

function showErrorOnScreen() {
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <div class="loading-screen">
        <div class="loading-spinner"></div>
        <div class="loading-text" id="status">
          ❌ JavaScript Errors (${errorMessages.length})<br/>
          ${errorMessages.map((text, i) => `Error #${i + 1}: ${text}`).join('<br/><br/>')}
        </div>
      </div>
    `;
  }
}

window.addEventListener('error', (e) => {
  console.error('[StudentApp] Global error:', e.error || e.message, e);
  errorCount++;
  const msg = e.error?.message || e.message || 'Unknown error';
  const stack = e.error?.stack || 'No stack trace';
  const file = e.filename || 'Unknown file';
  const line = e.lineno || '?';

  errorMessages.push(`Message: ${msg}\nFile: ${file}:${line}\n\nStack:\n${stack}`);

  setTimeout(() => showErrorOnScreen(), 500);
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('[StudentApp] Unhandled promise rejection:', e.reason);
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

// Prevent multiple executions
if (window.__REACT_APP_INITIALIZED__) {
  console.warn('⚠️ React already initialized, skipping duplicate render');
} else {
  window.__REACT_APP_INITIALIZED__ = true;

  console.log('🚀 React index.jsx executing');

  const root = document.getElementById('root');
  if (!root) {
    document.body.innerHTML = '<h1 style="color: red; padding: 20px;">CRITICAL: Root element not found!</h1>';
    throw new Error('Root element not found!');
  }

  // Clear all HTML immediately
  console.log('🧹 Clearing HTML placeholder');
  root.innerHTML = '';

  // Initialize render state
  window.StudentAppRenderState = {
    renderStarted: true,
    renderSucceeded: false,
    lastError: null
  };

  try {
    console.log('⚛️ Creating React root');
    const reactRoot = ReactDOM.createRoot(root);

    console.log('⚛️ Rendering App component');
    reactRoot.render(
      <React.StrictMode>
        <HashRouter>
          <SafeApp />
        </HashRouter>
      </React.StrictMode>
    );

    window.StudentAppRenderState.renderSucceeded = true;
    console.log('✅ React render initiated successfully');
  } catch (error) {
    console.error('❌ FATAL React render error:', error);
    window.StudentAppRenderState.lastError = error?.message || String(error);

    root.innerHTML = `
      <div style="padding: 20px; font-family: sans-serif; background: #fff; min-height: 100vh;">
        <h1 style="color: #e74c3c;">❌ Fatal React Error</h1>
        <p><strong>Error:</strong> ${error.message}</p>
        <pre style="background: #f5f5f5; padding: 15px; overflow: auto; font-size: 11px; border-radius: 8px; white-space: pre-wrap; word-wrap: break-word;">${error.stack || 'No stack trace'}</pre>
        <button onclick="window.location.reload()" style="padding: 12px 24px; margin-top: 20px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px;">Reload App</button>
      </div>
    `;
    throw error;
  }
}
