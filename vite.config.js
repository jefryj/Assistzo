import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    open: true
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  optimizeDeps: {
    include: ['leaflet']
  },
  build: {
    rollupOptions: {
    }
  },
  preview: {
    allowedHosts: [
      "assistzo.onrender.com"
    ]
  }
})

