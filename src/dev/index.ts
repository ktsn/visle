import assert from 'node:assert'

import connect from 'connect'
import { Connect, createServer, InlineConfig, isRunnableDevEnvironment } from 'vite'
import type { RunnableDevEnvironment, ViteDevServer } from 'vite'

import { RuntimeManifest } from '../server/manifest.js'
import { RenderLoader } from '../server/render.js'
import { getVisleConfig } from '../shared/config.js'
import { asAbs, resolve } from '../shared/path.js'
import { createDevManifest } from './manifest.js'

interface DevRenderLoader extends RenderLoader {
  middleware: Connect.Server
  close(): Promise<void>
}

export function createDevLoader(viteConfig: InlineConfig = {}): DevRenderLoader {
  let cachePromise: Promise<{ devServer: ViteDevServer; manifest: RuntimeManifest }> | undefined

  const middleware = connect()

  middleware.use((req, res, next) => {
    if (!cachePromise) {
      return next()
    }

    void cachePromise.then(({ devServer }) => {
      devServer.middlewares(req, res, next)
      return
    }, next)
  })

  /**
   * Get cached devServer and manifest.
   * Initialize them if not cached yet.
   */
  async function ensureDeps(): Promise<{ devServer: ViteDevServer; manifest: RuntimeManifest }> {
    if (!cachePromise) {
      cachePromise = createServer({
        ...viteConfig,
        appType: 'custom',
        server: {
          ...viteConfig.server,
          middlewareMode: true,
        },
        logLevel: 'silent',
      }).then((devServer) => {
        return {
          devServer,
          manifest: createDevManifest(devServer),
        }
      })
    }

    return cachePromise
  }

  return {
    async loadEntry(componentPath) {
      const { devServer } = await ensureDeps()

      const visleConfig = getVisleConfig(devServer.config)

      const modulePath = resolve(
        asAbs(devServer.config.root),
        visleConfig.entryDir,
        `${componentPath}.vue`,
      )

      try {
        const serverEnv = getServerEnvironment(devServer)
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
      if (cachePromise) {
        const { devServer } = await cachePromise
        await devServer.close()
      }
    },
  }
}

export function getServerEnvironment(devServer: ViteDevServer): RunnableDevEnvironment {
  const serverEnv = devServer.environments.server
  assert(
    serverEnv && isRunnableDevEnvironment(serverEnv),
    "[visle] Vite's server environment is not available. Make sure to add visle() plugin to your Vite config file.",
  )
  return serverEnv
}
