import { defineConfig } from 'vite'
import island from 'vue-islands-renderer/build'

export default defineConfig({
  plugins: [
    island({
      entry: 'src/server.ts',
    }),
  ],
})
