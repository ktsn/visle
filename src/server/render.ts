import { Component, createApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { Connect, createServer, ViteDevServer } from 'vite'
import connect from 'connect'
import * as path from 'node:path'
import { transformWithRenderContext } from './transform.js'
import { defaultConfig } from '../build/config.js'
import { pathToExportId } from '../build/generate.js'
import plugin from '../build/plugin.js'

export interface RenderOptions {
  isDev?: boolean
}

export interface RenderContext {
  loadCss?: Set<string>
  loadJs?: Set<string>
}

/**
 * Return a function that renders a Vue component to a HTML string.
 * The returned render function receives a path to a Vue component.
 * The base directory of the path is determined by the `templateDir` option
 * of islands.config.ts.
 *
 * If `isDev` option is false, component paths are automatically converted
 * to the ones in the `templateOutDir`.
 *
 * @param options
 * @returns
 */
export function createRender(options: RenderOptions = {}) {
  const { isDev = false } = options

  let devServer: ViteDevServer | undefined

  function resolveDevComponentPath(componentPath: string): string {
    const { root, componentDir } = defaultConfig
    const basePath = componentDir

    return path.resolve(path.join(root, basePath, `${componentPath}.vue`))
  }

  function resolveServerDistPath(): string {
    const { root, serverOutDir } = defaultConfig
    return path.resolve(path.join(root, serverOutDir, 'server-entry.js'))
  }

  async function loadComponent(componentPath: string): Promise<Component> {
    if (!isDev) {
      return import(resolveServerDistPath()).then((m) => {
        return m[pathToExportId(componentPath)]
      })
    }

    if (!devServer) {
      devServer = await createServer({
        appType: 'custom',
        server: { middlewareMode: true },
        plugins: [
          plugin({
            clientDist: defaultConfig.clientOutDir,
            componentDir: defaultConfig.componentDir,
          }),
        ],
      })
    }

    try {
      return devServer
        .ssrLoadModule(resolveDevComponentPath(componentPath))
        .then((m) => m.default)
    } catch (e) {
      if (e instanceof Error) {
        devServer.ssrFixStacktrace(e)
      }
      throw e
    }
  }

  async function render(componentPath: string, props?: any): Promise<string> {
    const component = await loadComponent(componentPath)

    const context: RenderContext = {}

    const app = createApp(component, props)
    const rendered = await renderToString(app, context)

    return transformWithRenderContext(rendered, context)
  }

  const devMiddlewars: Connect.Server = connect()

  devMiddlewars.use((req, res, next) => {
    if (!devServer) {
      return next()
    }

    devServer.middlewares(req, res, next)
  })

  render.devMiddlewares = devMiddlewars

  return render
}
