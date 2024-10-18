import { defineConfig } from 'vite'
import island from '../dist/build/index.js'

export default defineConfig({
  plugins: [
    island({
      clientDist: 'client-dist',
      serverDist: 'server-dist',
      islandDirectory: 'src/components',
    }),
  ],
})
