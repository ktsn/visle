import { Component, createApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { Connect, createServer, ViteDevServer } from 'vite'
import connect from 'connect'
import * as path from 'node:path'
import { transformWithRenderContext } from './transform.js'
import { defaultConfig } from '../build/config.js'

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

  function resolveComponentPath(componentPath: string): string {
    const { rootDir, componentDir, serverOutDir } = defaultConfig
    const basePath = isDev ? componentDir : serverOutDir

    console.log(path.resolve(path.join(rootDir, basePath, componentPath)))
    return path.resolve(path.join(rootDir, basePath, componentPath))
  }

  async function loadComponent(componentPath: string): Promise<Component> {
    const resolvedPath = resolveComponentPath(componentPath)

    if (!isDev) {
      return import(`${resolvedPath}.js`).then((m) => m.default)
    }

    if (!devServer) {
      devServer = await createServer({
        appType: 'custom',
        server: { middlewareMode: true },
      })
    }

    try {
      return devServer
        .ssrLoadModule(`${resolvedPath}.vue`)
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
