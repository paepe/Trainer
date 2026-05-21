import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main:   resolve(__dirname, 'index.html'),
        studio: resolve(__dirname, 'studio.html'),
      },
    },
  },
  server: {
    // Proxy /api to vercel dev (port 3000) when running npm run dev
    // Run `vercel dev` on port 3000 in a separate terminal to test AI locally
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
