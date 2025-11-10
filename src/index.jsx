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

// Global error handlers for logging only (don't manipulate DOM after React starts)
window.addEventListener('error', (e) => {
  console.error('[StudentApp] Global error:', e.error || e.message, e);
  const msg = e.error?.message || e.message || 'Unknown error';
  const stack = e.error?.stack || 'No stack trace';
  const file = e.filename || 'Unknown file';
  const line = e.lineno || '?';
  console.error(`❌ Error: ${msg} at ${file}:${line}\n${stack}`);
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('[StudentApp] Unhandled promise rejection:', e.reason);
  console.error(`❌ Promise Rejection: ${e.reason}\n${e.reason?.stack || ''}`);
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
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <div style="padding: 20px; font-family: sans-serif; background: #fff3cd; min-height: 100vh; border-left: 4px solid #ffc107;">
        <h1 style="color: #856404;">⚠️ Duplicate Initialization Prevented</h1>
        <p><strong>React is already running.</strong> The initialization guard prevented a duplicate render.</p>
        <p>If you see this message, it means the module script executed twice, but the guard worked correctly.</p>
        <p>The app should already be visible. If not, try reloading.</p>
        <button onclick="window.location.reload()" style="padding: 12px 24px; margin-top: 20px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px;">Reload App</button>
      </div>
    `;
  }
} else {
  window.__REACT_APP_INITIALIZED__ = true;

  console.log('🚀 React index.jsx executing');

  const root = document.getElementById('root');
  if (!root) {
    document.body.innerHTML = '<h1 style="color: red; padding: 20px;">CRITICAL: Root element not found!</h1>';
    throw new Error('Root element not found!');
  }

  // Keep loading screen visible, show status
  console.log('🎬 Preparing React initialization');
  root.innerHTML = `
    <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: #667eea; display: flex; align-items: center; justify-content: center; flex-direction: column; font-family: Arial, sans-serif; color: white;">
      <div style="width: 50px; height: 50px; border: 4px solid rgba(255,255,255,0.3); border-top: 4px solid white; border-radius: 50%; animation: spin 1s linear infinite;"></div>
      <div style="margin-top: 20px; font-size: 16px;" id="status">Initializing React...</div>
      <div style="margin-top: 10px; font-size: 12px; opacity: 0.8;" id="substatus">Please wait</div>
    </div>
    <style>
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    </style>
  `;

  // Initialize render state
  window.StudentAppRenderState = {
    renderStarted: true,
    renderSucceeded: false,
    lastError: null
  };

  // Failsafe: If React doesn't render within 5 seconds, show error
  const failsafeTimeout = setTimeout(() => {
    if (!window.StudentAppRenderState.renderSucceeded) {
      console.error('❌ React failed to render within 5 seconds');
      root.innerHTML = `
        <div style="padding: 20px; font-family: sans-serif; background: #fff; min-height: 100vh;">
          <h1 style="color: #e74c3c;">❌ React Render Timeout</h1>
          <p><strong>Issue:</strong> React did not render within 5 seconds</p>
          <p>Last error: ${window.StudentAppRenderState.lastError || 'None captured'}</p>
          <p>Check console logs for more details</p>
          <button onclick="window.location.reload()" style="padding: 12px 24px; margin-top: 20px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px;">Reload App</button>
        </div>
      `;
    }
  }, 5000);

  try {
    console.log('⚛️ Creating React root');
    showStatus('Creating React root...');
    const reactRoot = ReactDOM.createRoot(root);

    console.log('⚛️ Rendering App component');
    showStatus('Rendering App component...');

    // TEMPORARY: Render simple test UI instead of full app to isolate the issue
    reactRoot.render(
      <div style={{padding: '40px', fontFamily: 'Arial', backgroundColor: '#10b981', minHeight: '100vh', color: 'white'}}>
        <h1>✅ React Rendered Successfully!</h1>
        <p>If you see this green screen, React is working!</p>
        <p>Build time: {new Date().toISOString()}</p>
        <button
          onClick={() => {
            // Now try loading the real app
            reactRoot.render(
              <React.StrictMode>
                <HashRouter>
                  <SafeApp />
                </HashRouter>
              </React.StrictMode>
            );
          }}
          style={{padding: '15px 30px', fontSize: '16px', background: 'white', color: '#10b981', border: 'none', borderRadius: '8px', cursor: 'pointer', marginTop: '20px'}}
        >
          Load Full App
        </button>
      </div>
    );

    // Mark as succeeded and clear failsafe
    window.StudentAppRenderState.renderSucceeded = true;
    clearTimeout(failsafeTimeout);
    console.log('✅ React render initiated successfully');
  } catch (error) {
    clearTimeout(failsafeTimeout);
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
