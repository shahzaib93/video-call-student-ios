import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Custom plugin to inject SystemJS loader and convert module scripts for iOS compatibility
function systemJSPlugin() {
  return {
    name: 'systemjs-plugin',
    transformIndexHtml(html) {
      // Add SystemJS loader script before any module scripts
      html = html.replace(
        '<head>',
        '<head>\n    <script src="https://cdn.jsdelivr.net/npm/systemjs@6.15.1/dist/s.min.js"></script>'
      );
      // Convert module scripts to SystemJS imports
      html = html.replace(
        /<script type="module" crossorigin src="([^"]+)"><\/script>/g,
        '<script>System.import("$1")</script>'
      );
      // Remove modulepreload hints (not needed for SystemJS)
      html = html.replace(
        /<link rel="modulepreload"[^>]*>/g,
        ''
      );
      return html;
    }
  };
}

export default defineConfig({
  plugins: [
    react(),
    systemJSPlugin()
  ],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2015',
    minify: false,  // Disable minification to speed up build
    sourcemap: false,
    rollupOptions: {
      output: {
        format: 'system',  // Use SystemJS format for better iOS compatibility
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore']
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