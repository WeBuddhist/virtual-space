import { defineConfig } from 'vite';
import { audioStudio } from './studio/plugin';

const SERVER = process.env.RITRO_SERVER ?? 'http://localhost:8787';

export default defineConfig({
  plugins: [audioStudio()],
  build: { target: 'es2022' },
  server: {
    port: 5173,
    proxy: {
      '/presence': { target: SERVER.replace(/^http/, 'ws'), ws: true },
      '/rooms': { target: SERVER },
      '/ice': { target: SERVER },
    },
  },
});
