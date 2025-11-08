import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
// import TestApp from './TestApp';

// Add error boundary for debugging
window.addEventListener('error', (e) => {
  console.error('Global error:', e.error);
  alert(`Error: ${e.error?.message || 'Unknown error'}`);
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled promise rejection:', e.reason);
  alert(`Promise error: ${e.reason}`);
});

try {
  const root = document.getElementById('root');
  if (!root) {
    throw new Error('Root element not found!');
  }

  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <HashRouter>
        <App />
      </HashRouter>
    </React.StrictMode>
  );
} catch (error) {
  console.error('Failed to render app:', error);
  document.body.innerHTML = `
    <div style="padding: 20px; font-family: sans-serif;">
      <h1>App Failed to Load</h1>
      <p style="color: red;">${error.message}</p>
      <p>Please check the console for more details.</p>
    </div>
  `;
}