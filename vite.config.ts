import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
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
