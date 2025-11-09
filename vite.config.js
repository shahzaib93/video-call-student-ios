import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Custom plugin to remove crossorigin attribute from script tags for iOS WebView compatibility
function removeCrossorigin() {
  return {
    name: 'remove-crossorigin',
    transformIndexHtml(html) {
      return html.replace(/ crossorigin/g, '');
    }
  };
}

export default defineConfig({
  plugins: [
    react(),
    removeCrossorigin()
  ],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2015',
    minify: 'terser',
    sourcemap: false,
    rollupOptions: {
      output: {
        format: 'es',  // Keep ES format but remove crossorigin attribute
        manualChunks: {
          vendor: ['react', 'react-dom'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          material: ['@mui/material', '@emotion/react', '@emotion/styled']
        }
      }
    }
  },
  server: {
    port: 3003,
    host: '0.0.0.0', // Allow network access - HTTP for network, HTTPS not needed for Jitsi iframe
    strictPort: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
    esbuildOptions: {
      target: 'es2015'
    }
  },
  define: {
    global: 'globalThis',
    'process.env': '{}',
    // Fix __dirname and __filename for mobile app compatibility
    '__dirname': '"/"',
    '__filename': '"/app.js"',
    // Add crypto.randomUUID polyfill for older browsers
    'crypto.randomUUID': `(() => {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID.bind(crypto);
      }
      return () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0;
        var v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    })()`
  },
});