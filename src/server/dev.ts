import path from 'node:path'

import connect from 'connect'
import { Connect, createServer, InlineConfig, RunnableDevEnvironment, ViteDevServer } from 'vite'

import { getVisleConfig } from '../build/config.js'
import { resolveDevComponentPath } from '../build/paths.js'
import { createDevManifest, RuntimeManifest } from './manifest.js'
import { RenderLoader } from './render.js'

interface DevRenderLoader extends RenderLoader {
  middleware: Connect.Server
  close(): Promise<void>
}

export function createDevLoader(viteConfig: InlineConfig = {}): DevRenderLoader {
  let cachedDevServer: ViteDevServer | undefined
  let cachedManifest: RuntimeManifest | undefined

  const middleware = connect()

  middleware.use((req, res, next) => {
    if (!cachedDevServer) {
      return next()
    }

    cachedDevServer.middlewares(req, res, next)
  })

  /**
   * Get cached devServer and manifest.
   * Initialize them if not cached yet.
   */
  async function ensureDeps(): Promise<{ devServer: ViteDevServer; manifest: RuntimeManifest }> {
    if (!cachedDevServer) {
      cachedDevServer = await createServer({
        ...viteConfig,
        appType: 'custom',
        server: {
          middlewareMode: true,
        },
        logLevel: 'silent',
      })
    }

    if (!cachedManifest) {
      cachedManifest = createDevManifest(cachedDevServer.config)
    }

    return {
      devServer: cachedDevServer,
      manifest: cachedManifest,
    }
  }

  return {
    async loadEntry(componentPath) {
      const { devServer } = await ensureDeps()

      const visleConfig = getVisleConfig(devServer.config)

      const modulePath = resolveDevComponentPath(
        path.join(devServer.config.root, visleConfig.entryDir),
        componentPath,
      )

      try {
        const serverEnv = devServer.environments.server as RunnableDevEnvironment
        const module = await serverEnv.runner.import(modulePath)
        return module.default
      } catch (e) {
        if (e instanceof Error) {
          devServer.ssrFixStacktrace(e)
        }
        throw e
      }
    },

    async getManifest() {
      const { manifest } = await ensureDeps()
      return manifest
    },

    middleware,

    async close() {
      if (cachedDevServer) {
        await cachedDevServer.close()
      }
    },
  }
}
