import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/incremental-game-engine/',
  plugins: [react()],
})
