import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
  },
  server: {
    port: 3000,
    proxy: {
      // Local dev: proxy /api/* to Express on :3001
      // Production (Vercel): /api/* is handled by the /api directory functions
      '/api': {
        target:       'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
