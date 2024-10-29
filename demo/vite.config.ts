import { defineConfig } from 'vite'
import island from '@ktsn/vue-island/build'

export default defineConfig({
  plugins: [
    island({
      clientDist: 'client-dist',
      serverDist: 'server-dist',
      islandDirectory: 'src/components',
    }),
  ],
})
