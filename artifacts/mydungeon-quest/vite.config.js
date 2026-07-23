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
    proxy: {
      '/api': `http://127.0.0.1:${internalApiPort}`,
      // The store dowry rides the server even in dev, so the preview answers
      // the same way production does.
      '/.well-known': `http://127.0.0.1:${internalApiPort}`
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'es2022',
    // Terser is the honest lightening (lean door): the same timber planed
    // finer — nothing hidden in a second synchronous chunk.
    minify: 'terser',
    // THE LEAN DOOR (XX, Law V) — the build writes its own manifest so the
    // lean-door gate can read the entry chunk's true weight from the house's
    // own ledger (dist/.vite/manifest.json), never from guesswork.
    manifest: true
  }
});
