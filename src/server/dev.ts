import {
  Connect,
  createServer,
  RunnableDevEnvironment,
  ViteDevServer,
} from 'vite'
import connect from 'connect'
import { RenderLoader } from './render.js'
import { visle } from '../build/index.js'
import { resolveDevComponentPath } from '../build/paths.js'

interface DevRenderLoader extends RenderLoader {
  middleware: Connect.Server
}

export function createDevLoader(): DevRenderLoader {
  let devServer: ViteDevServer

  const middleware = connect()

  middleware.use((req, res, next) => {
    if (!devServer) {
      return next()
    }

    devServer.middlewares(req, res, next)
  })

  return {
    async loadComponent(config, componentPath) {
      if (!devServer) {
        devServer = await createServer({
          appType: 'custom',
          server: {
            middlewareMode: true,
          },
          logLevel: 'silent',
          root: config.root,
          plugins: [
            visle({
              componentDir: config.componentDir,
              clientOutDir: config.clientOutDir,
              serverOutDir: config.serverOutDir,
            }),
          ],
        })
      }

      const modulePath = resolveDevComponentPath(
        config.root,
        config.componentDir,
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
