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
  let devServer: ViteDevServer
  let devManifest: RuntimeManifest

  const middleware = connect()

  middleware.use((req, res, next) => {
    if (!devServer) {
      return next()
    }

    devServer.middlewares(req, res, next)
  })

  return {
    async loadComponent(componentPath) {
      if (!devServer) {
        devServer = await createServer({
          ...viteConfig,
          appType: 'custom',
          server: {
            middlewareMode: true,
          },
          logLevel: 'silent',
        })

        devManifest = createDevManifest({
          root: devServer.config.root,
          base: devServer.config.base,
          server: { origin: devServer.config.server.origin },
          isProduction: devServer.config.isProduction,
        })
      }

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

    get manifest() {
      return devManifest
    },

    middleware,

    async close() {
      if (devServer) {
        await devServer.close()
      }
    },
  }
}
