import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: { '/api': process.env.ORDER_API_PROXY || 'http://127.0.0.1:5174' },
    // Wait for formatter writes to settle before transforming a module on Windows.
    watch: { awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 } },
  },
  preview: { port: 4173, strictPort: true, proxy: { '/api': 'http://127.0.0.1:5174' } },
});
