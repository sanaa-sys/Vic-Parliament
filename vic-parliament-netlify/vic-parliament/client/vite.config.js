import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  build: {
    // Output to client/dist (referenced by netlify.toml publish = "client/dist")
    outDir: 'dist',
  },

  server: {
    port: 3000,
    proxy: {
      // In development, proxy /api/* to the local Express server on port 3001.
      // In production (Netlify), /api/* is handled by netlify.toml redirects
      // to /.netlify/functions/:splat — no proxy needed.
      '/api': {
        target:       'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
