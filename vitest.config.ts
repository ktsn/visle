import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    snapshotSerializers: ['./test/html-serializer.ts'],
  },
})
