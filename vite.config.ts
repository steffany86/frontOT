import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    allowedHosts: ['.ngrok-free.app','.ngrok-free.dev', '.makiro.com.bo', 'tigohogar.makiro.com.bo', 'localhost', '127.0.0.1'],
    proxy: {
      '/api': {
        target: 'http://localhost:9060',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
