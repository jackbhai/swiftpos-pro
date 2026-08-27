import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: { alias: { '@': path.resolve(process.cwd(), 'src') } },
  server: { host: '0.0.0.0', port: 5173, allowedHosts: true, cors: true },
  preview: { host: '0.0.0.0', port: 4173, allowedHosts: true },
  build: { chunkSizeWarningLimit: 1600 },
})
