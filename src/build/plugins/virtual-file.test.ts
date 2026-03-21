import { createServer, type ViteDevServer } from 'vite'
import { describe, test, expect, afterEach } from 'vite-plus/test'

import { defaultConfig } from '../../shared/config.ts'
import { virtualIslandsBootstrapPath } from '../../shared/entry.ts'
import { virtualFilePlugin } from './virtual-file.ts'

describe('virtualFilePlugin', () => {
  let server: ViteDevServer | undefined

  afterEach(async () => {
    await server?.close()
    server = undefined
  })

  test('islands bootstrap is transformable in client environment', async () => {
    server = await createServer({
      configFile: false,
      plugins: [virtualFilePlugin(defaultConfig)],
      appType: 'custom',
      server: { middlewareMode: true },
      optimizeDeps: { noDiscovery: true },
      logLevel: 'silent',
    })

    const result = await server.environments.client.transformRequest(virtualIslandsBootstrapPath)

    expect(result).not.toBeNull()
    expect(result!.code).toContain('vue-island')
  })
})
