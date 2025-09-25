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
  // 🚀 배포 시 정적 파일 경로 인식 문제 해결
  base: '/',            // 반드시 추가 (기본 public path)
  build: {
    outDir: 'dist',
    emptyOutDir: true,  // 빌드 시 dist 폴더 초기화
  },
})
