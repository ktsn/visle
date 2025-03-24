import { Component, createApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { Connect, createServer, ViteDevServer } from 'vite'
import connect from 'connect'
import { transformWithRenderContext } from './transform.js'
import {
  IslandsConfig,
  resolveConfig,
  ResolvedIslandsConfig,
} from '../build/config.js'
import {
  pathToExportName,
  resolveDevComponentPath,
  resolveServerDistPath,
} from '../build/paths.js'
import { islandPlugin } from '../build/plugins/index.js'

export interface RenderOptions extends IslandsConfig {
  isDev?: boolean
}

export interface RenderContext {
  loadCss?: Set<string>
  loadJs?: Set<string>
}

type RenderFunction = (componentPath: string, props?: any) => Promise<string>

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
export function createRender(options: RenderOptions = {}): RenderFunction {
  const { isDev = false, ...inlineConfig } = options

  let devServer: ViteDevServer | undefined
  let config: ResolvedIslandsConfig | undefined

  async function loadComponent(componentPath: string): Promise<Component> {
    // Lazy load and cache the config on first call
    if (!config) {
      config = {
        ...(await resolveConfig()),
        ...inlineConfig,
      }
    }

    if (!isDev) {
      return import(/* @vite-ignore */ resolveServerDistPath(config)).then(
        (m) => {
          return m[pathToExportName(componentPath)]
        },
      )
    }

    if (!devServer) {
      devServer = await createServer({
        appType: 'custom',
        server: { middlewareMode: true },
        logLevel: 'silent',

        root: config.root,

        plugins: [islandPlugin(config)],
      })
    }

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
