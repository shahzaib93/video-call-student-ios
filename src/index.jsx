import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
// import TestApp from './TestApp';

// Add error boundary for debugging
let errorCount = 0;
window.addEventListener('error', (e) => {
  console.error('Global error:', e.error);
  errorCount++;
  if (errorCount <= 2) {
    const msg = e.error?.message || e.message || 'Unknown error';
    const stack = e.error?.stack ? '\n\nStack: ' + e.error.stack.substring(0, 200) : '';
    alert(`iOS Error #${errorCount}:\n${msg}${stack}`);
  }
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled promise rejection:', e.reason);
  errorCount++;
  if (errorCount <= 2) {
    alert(`iOS Promise Error #${errorCount}:\n${e.reason}`);
  }
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
  const root = document.getElementById('root');
  if (!root) {
    throw new Error('Root element not found!');
  }

  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <HashRouter>
        <SafeApp />
      </HashRouter>
    </React.StrictMode>
  );
} catch (error) {
  console.error('Failed to render app:', error);
  document.body.innerHTML = `
    <div style="padding: 20px; font-family: sans-serif; background: white; min-height: 100vh;">
      <h1 style="color: #e74c3c;">Fatal Error</h1>
      <p><strong>Error:</strong> ${error.message}</p>
      <pre style="background: #f5f5f5; padding: 10px; overflow: auto;">${error.stack || 'No stack trace'}</pre>
      <button onclick="window.location.reload()" style="padding: 10px 20px; margin-top: 20px;">Reload App</button>
    </div>
  `;
}