import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_BASE_URL || 'http://34.228.112.95',
        changeOrigin: true,
        secure: false,
        // ✅ 프론트의 /api/auth/... -> 백엔드의 /auth/... 로 전달
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/media': {
        target: process.env.VITE_API_BASE_URL || 'http://34.228.112.95',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/media/, '/media'),
      },
      '/static': {
        target: process.env.VITE_API_BASE_URL || 'http://34.228.112.95',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/static/, '/static'),
      },
    },
  },
  build: { outDir: 'dist' },
})
