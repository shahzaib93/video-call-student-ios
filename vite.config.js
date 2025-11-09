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
        let scriptSrc = '';
        html = html.replace(/<script[^>]*src="(\.\/assets\/[^"]*\.js)"[^>]*><\/script>/g, (match, src) => {
          scriptSrc = src;
          scriptTag = match;
          return ''; // Remove from head
        });

        // Clean the script tag and add error handling
        scriptTag = scriptTag
          .replace(/type="module"\s*/g, '')
          .replace(/crossorigin\s*/g, '')
          .replace(/\s+>/g, '>') // Clean up extra spaces
          .replace('>', ' onerror="updateStatus(\'❌ Script failed to load: ' + scriptSrc + '\')">')

        // Add inline script before the main script to detect if it loads
        const inlineScript = `
    <script>
      console.log('🔧 About to load app bundle: ${scriptSrc}');
      window.addEventListener('error', function(e) {
        if (e.filename && e.filename.includes('app.js')) {
          console.error('❌ Error in app.js:', e.message, e.lineno);
          updateStatus('❌ Error in app.js: ' + e.message);
        }
      }, true);
    </script>`;

        // Move scripts to end of body (before </body>)
        html = html.replace('</body>', `${inlineScript}\n  ${scriptTag}\n  </body>`);

        console.log('✅ Script tag moved to end of body with error handling');
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
        format: 'es',  // Back to ES modules but plugin will remove type="module"
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