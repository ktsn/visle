import { createServer, type ViteDevServer } from 'vite'
import { describe, test, expect, afterEach } from 'vite-plus/test'

import { defaultConfig } from '../../shared/config.ts'
import { islandsBootstrapPath } from '../../shared/entry.ts'
import { virtualFilePlugins } from './virtual-file.ts'

describe('virtualFilePlugin', () => {
  let server: ViteDevServer | undefined

  afterEach(async () => {
    await server?.close()
    server = undefined
  })

  test('islands bootstrap is transformable in client environment', async () => {
    server = await createServer({
      configFile: false,
      plugins: [
        virtualFilePlugins(defaultConfig, () => {
          throw new Error('manifest should not be requested')
        }),
      ],
      appType: 'custom',
      server: { middlewareMode: true },
      optimizeDeps: { noDiscovery: true },
      logLevel: 'silent',
    })

    const result = await server.environments.client.transformRequest(islandsBootstrapPath)

    expect(result).not.toBeNull()
    expect(result!.code).toContain('vue-island')
  })
})
