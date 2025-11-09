import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Plugin to fix script tags for iOS compatibility
function fixScriptTags() {
  return {
    name: 'fix-script-tags',
    enforce: 'post',  // Run AFTER Vite's built-in transforms
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        console.log('🔧 Fixing script tags for iOS compatibility...');

        // Extract script tags from head
        let scriptTag = '';
        html = html.replace(/<script[^>]*src="\.\/assets\/[^"]*\.js"[^>]*><\/script>/g, (match) => {
          scriptTag = match;
          return ''; // Remove from head
        });

        // Clean the script tag (remove type="module" and crossorigin)
        scriptTag = scriptTag
          .replace(/type="module"\s*/g, '')
          .replace(/crossorigin\s*/g, '')
          .replace(/\s+>/g, '>'); // Clean up extra spaces

        // Move script to end of body (before </body>)
        html = html.replace('</body>', `  ${scriptTag}\n  </body>`);

        console.log('✅ Script tag moved to end of body');
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