import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const port = Number(process.env.PORT || 5173);
const internalApiPort = Number(process.env.INTERNAL_API_PORT || 3001);

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port,
    strictPort: true,
    allowedHosts: true,
    proxy: { '/api': `http://127.0.0.1:${internalApiPort}` }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'es2022'
  }
});
