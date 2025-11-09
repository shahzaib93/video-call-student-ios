import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

function fixScriptTags() {
  return {
    name: 'fix-script-tags',
    enforce: 'post',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        console.log('🔧 Removing type="module" for iOS...');
        html = html.replace(/\s*type="module"\s*/g, ' ');
        html = html.replace(/\s*crossorigin\s*/g, ' ');
        html = html.replace(/<script\s+/g, '<script ');
        html = html.replace(/\s+>/g, '>');
        console.log('✅ Script tags fixed');
        return html;
      }
    }
  };
}

export default defineConfig({
  plugins: [
    react(),
    fixScriptTags()
  ],
  base: '',  // Empty base for capacitor:// scheme compatibility
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: ['es2015', 'safari11'],  // Target older iOS Safari
    minify: 'terser',  // Re-enable minification
    modulePreload: false,  // Don't preload modules
    sourcemap: false,
    commonjsOptions: {
      transformMixedEsModules: true  // Handle mixed ES/CommonJS modules
    },
    rollupOptions: {
      output: {
        format: 'es',  // ES modules work fine on iOS 16+
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name].[ext]',
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
