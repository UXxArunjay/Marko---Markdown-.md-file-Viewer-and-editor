import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    port: 5173,
    open: false,
    host: true,
    watch: {
      ignored: ['**/release/**']
    },
    proxy: {
      '/api/claude': {
        target: 'https://api.anthropic.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/claude/, ''),
        headers: {
          'anthropic-version': '2023-06-01'
        }
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
