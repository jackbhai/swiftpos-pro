import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { execSync } from 'node:child_process';
import pkg from './package.json';

const commit = (() => {
  try { return execSync('git rev-parse --short HEAD').toString().trim(); } catch { return 'local'; }
})();

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: './',
  resolve: { alias: { '@': path.resolve(process.cwd(), 'src') } },
  server: { host: '0.0.0.0', port: 5173, allowedHosts: true, cors: true },
  preview: { host: '0.0.0.0', port: 4173, allowedHosts: true },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __COMMIT__: JSON.stringify(commit),
  },
  esbuild: mode === 'production' ? { drop: ['debugger'], pure: ['console.debug', 'console.trace'] } : {},
  build: {
    chunkSizeWarningLimit: 1200,
    sourcemap: false,
    cssCodeSplit: true,
    reportCompressedSize: false,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          data: ['dexie', 'dexie-react-hooks', 'zustand'],
          media: ['qrcode', 'html-to-image'],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
    coverage: { reporter: ['text'] },
  },
} as any));
