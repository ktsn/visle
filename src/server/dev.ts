import path from 'node:path'
import {
  Connect,
  createServer,
  InlineConfig,
  RunnableDevEnvironment,
  ViteDevServer,
} from 'vite'
import connect from 'connect'
import { RenderLoader } from './render.js'
import { getVisleConfig } from '../build/config.js'
import { resolveDevComponentPath } from '../build/paths.js'

interface DevRenderLoader extends RenderLoader {
  middleware: Connect.Server
}

export function createDevLoader(
  viteConfig: InlineConfig = {},
): DevRenderLoader {
  let devServer: ViteDevServer

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
      }

      const visleConfig = getVisleConfig(devServer.config)

      const modulePath = resolveDevComponentPath(
        path.join(devServer.config.root, visleConfig.componentDir),
        componentPath,
      )

      try {
        const ssrEnv = devServer.environments.ssr as RunnableDevEnvironment
        const module = await ssrEnv.runner.import(modulePath)
        return module.default
      } catch (e) {
        if (e instanceof Error) {
          devServer.ssrFixStacktrace(e)
        }
        throw e
      }
    },

    middleware,
  }
}
