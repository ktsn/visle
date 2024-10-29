import { defineConfig } from 'vite'
import island from '@ktsn/vue-island/build'

export default defineConfig({
  plugins: [island()],
})
