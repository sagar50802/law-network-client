import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/',  // ✅ Add this line
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    open: true,
    proxy: {
      "/api": { target: "http://localhost:5000", changeOrigin: true },
      "/uploads": { target: "http://localhost:5000", changeOrigin: true }
    },
  },
});
