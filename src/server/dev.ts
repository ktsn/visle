import { Connect, createServer, ViteDevServer } from 'vite'
import connect from 'connect'
import { RenderLoader } from './render.js'
import { islandPlugin } from '../build/plugins/index.js'
import { resolveDevComponentPath } from '../build/paths.js'

interface DevRenderLoader extends RenderLoader {
  middleware: Connect.Server
}

export function createDevLoader(): DevRenderLoader {
  let devServer: ViteDevServer | undefined

  const middleware = connect()

  middleware.use((req, res, next) => {
    if (!devServer) {
      return next()
    }

    devServer.middlewares(req, res, next)
  })

  return {
    async loadComponent(config, componentPath) {
      devServer = await createServer({
        appType: 'custom',
        server: {
          middlewareMode: true,
          origin: config.devOrigin,
        },
        logLevel: 'silent',
        root: config.root,
        plugins: [islandPlugin(config)],
      })

      try {
        return devServer
          .ssrLoadModule(resolveDevComponentPath(config, componentPath))
          .then((m) => m.default)
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
