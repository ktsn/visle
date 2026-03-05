import { createServer, type ViteDevServer } from 'vite'
import { describe, test, expect, afterEach } from 'vitest'

import { defaultConfig } from '../config.ts'
import { virtualCustomElementEntryPath } from '../paths.ts'
import { virtualFilePlugin } from './virtual-file.ts'

describe('virtualFilePlugin', () => {
  let server: ViteDevServer | undefined

  afterEach(async () => {
    await server?.close()
    server = undefined
  })

  test('custom element entry is transformable in client environment', async () => {
    server = await createServer({
      configFile: false,
      plugins: [virtualFilePlugin(defaultConfig)],
      appType: 'custom',
      server: { middlewareMode: true },
      optimizeDeps: { noDiscovery: true },
      logLevel: 'silent',
    })

    const result = await server.environments.client.transformRequest(
      virtualCustomElementEntryPath,
    )

    expect(result).not.toBeNull()
    expect(result!.code).toContain('vue-island')
  })
})
