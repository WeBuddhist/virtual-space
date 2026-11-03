import { defineConfig } from 'vite';

const SERVER = process.env.RITRO_SERVER ?? 'http://localhost:8787';

export default defineConfig({
  build: { target: 'es2022' },
  server: {
    port: 5173,
    proxy: {
      '/presence': { target: SERVER.replace(/^http/, 'ws'), ws: true },
      '/rooms': { target: SERVER },
    },
  },
});
