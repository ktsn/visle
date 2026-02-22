import { defineConfig } from 'vite'

import { visle } from '../../src/build/index.ts'

export default defineConfig({
  root: 'test/__generated__/build-utils/',

  plugins: [
    visle({
      clientOutDir: 'dist/client',
      entryDir: '',
    }),
  ],
})
