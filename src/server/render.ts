import { Component, createApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { transformWithRenderContext } from './transform.js'
import {
  IslandsConfig,
  resolveConfig,
  ResolvedIslandsConfig,
} from '../build/config.js'
import { pathToExportName, resolveServerDistPath } from '../build/paths.js'

export interface RenderOptions extends IslandsConfig {
  loader?: RenderLoader
}

export interface RenderLoader {
  loadComponent(
    config: ResolvedIslandsConfig,
    componentPath: string,
  ): Promise<Component>
}

export interface RenderContext {
  loadCss?: Set<string>
  loadJs?: Set<string>
}

type RenderFunction = (componentPath: string, props?: any) => Promise<string>

const defaultLoader: RenderLoader = {
  loadComponent(config, componentPath) {
    return import(/* @vite-ignore */ resolveServerDistPath(config)).then(
      (m) => m[pathToExportName(componentPath)],
    )
  },
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
export function createRender(options: RenderOptions = {}): RenderFunction {
  const { loader = defaultLoader, ...inlineConfig } = options

  let config: ResolvedIslandsConfig | undefined

  async function loadComponent(componentPath: string): Promise<Component> {
    // Lazy load and cache the config on first call
    if (!config) {
      config = {
        ...(await resolveConfig()),
        ...inlineConfig,
      }
    }

    return loader.loadComponent(config, componentPath)
  }

  async function render(componentPath: string, props?: any): Promise<string> {
    const component = await loadComponent(componentPath)

    const context: RenderContext = {}

    const app = createApp(component, props)
    const rendered = await renderToString(app, context)

    return transformWithRenderContext(rendered, context)
  }

  return render
}
