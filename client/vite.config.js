import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5001',      // ⬅️ 5000 → 5001
        changeOrigin: true,
      },
      '/get-orders': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
      '/create-order': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
      '/verify-payment': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
    },
  },
});