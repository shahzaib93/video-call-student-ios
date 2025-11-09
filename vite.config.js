import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Plugin to remove type="module" from script tags for iOS compatibility
function removeModuleType() {
  return {
    name: 'remove-module-type',
    enforce: 'post',  // Run AFTER Vite's built-in transforms
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        console.log('🔧 Removing type="module" from script tags...');
        // Remove type="module" and crossorigin from all script tags
        const result = html
          .replace(/<script type="module" crossorigin/g, '<script')
          .replace(/<script type="module"/g, '<script')
          .replace(/crossorigin/g, '');
        console.log('✅ Script tags cleaned for iOS compatibility');
        return result;
      }
    }
  };
}

export default defineConfig({
  plugins: [
    react(),
    removeModuleType()
  ],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: ['es2015', 'safari11'],  // Target older iOS Safari
    minify: false,  // Disable minification for better compatibility
    sourcemap: false,
    commonjsOptions: {
      transformMixedEsModules: true  // Handle mixed ES/CommonJS modules
    },
    rollupOptions: {
      output: {
        format: 'iife',  // Self-executing function - no modules at all
        name: 'TarteelApp',
        inlineDynamicImports: true,  // Bundle everything into one file
        entryFileNames: 'assets/app.js',  // Single output file
        assetFileNames: 'assets/[name].[ext]'
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