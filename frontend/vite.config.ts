import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'react-dom/client': path.resolve(__dirname, '../node_modules/react-dom/client.js'),
    }
  },
  optimizeDeps: {
    include: ['react-dom/client', '@react-three/fiber', '@react-three/drei', 'three']
  }
})
