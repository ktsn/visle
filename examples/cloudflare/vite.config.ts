import { cloudflare } from '@cloudflare/vite-plugin'
import { visle } from 'visle/build'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [visle({ serverBuild: 'integrated' }), cloudflare({ viteEnvironment: { name: 'ssr' } })],
})
