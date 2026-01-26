import { Component, createApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { transformWithRenderContext } from './transform.js'
import {
  VisleConfig,
  ResolvedVisleConfig,
  resolveVisleConfig,
} from '../build/config.js'
import { pathToExportName, resolveServerDistPath } from '../build/paths.js'

/**
 * Render options extending VisleConfig
 */
export interface RenderOptions extends VisleConfig {
  /**
   * Root directory for resolving paths.
   * Defaults to process.cwd()
   */
  root?: string
}

/**
 * Resolved render options with all values guaranteed
 */
export interface ResolvedRenderOptions extends ResolvedVisleConfig {
  root: string
}

export interface RenderLoader {
  loadComponent(
    config: ResolvedRenderOptions,
    componentPath: string,
  ): Promise<Component>
}

export interface RenderContext {
  loadCss?: Set<string>
  loadJs?: Set<string>
}

interface RenderFunction {
  (componentPath: string, props?: any): Promise<string>
  setLoader(loader: RenderLoader): void
}

const defaultLoader: RenderLoader = {
  loadComponent(config, componentPath) {
    return import(
      /* @vite-ignore */ resolveServerDistPath(config.root, config.serverOutDir)
    ).then((m) => m[pathToExportName(componentPath)])
  },
}

/**
 * Return a function that renders a Vue component to a HTML string.
 * The returned render function receives a path to a Vue component.
 * The base directory of the path is determined by the `componentDir` option.
 *
 * @param options
 * @returns
 */
export function createRender(options: RenderOptions = {}): RenderFunction {
  let loader: RenderLoader = defaultLoader
  const config: ResolvedRenderOptions = {
    ...resolveVisleConfig(options),
    root: options.root ?? process.cwd(),
  }

  async function loadComponent(componentPath: string): Promise<Component> {
    return loader.loadComponent(config, componentPath)
  }

  async function render(componentPath: string, props?: any): Promise<string> {
    const component = await loadComponent(componentPath)

    const context: RenderContext = {}

    const app = createApp(component, props)
    const rendered = await renderToString(app, context)

    return transformWithRenderContext(rendered, context)
  }

  render.setLoader = (newLoader: RenderLoader) => {
    loader = newLoader
  }

  return render
}
