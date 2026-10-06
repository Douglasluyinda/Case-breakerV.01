import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./app/test/setup.js'],
    include: ['app/**/*.test.{js,jsx}'],
    css: false,
  },
})
