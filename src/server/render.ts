import { Component, createApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { transformWithRenderContext } from './transform.js'
import { defaultConfig } from '../build/config.js'
import { pathToExportName, resolveServerDistPath } from '../build/paths.js'

export interface RenderOptions {
  serverOutDir?: string
}

export interface RenderLoader {
  loadComponent(componentPath: string): Promise<Component>
}

export interface RenderContext {
  loadCss?: Set<string>
  loadJs?: Set<string>
}

interface RenderFunction {
  (componentPath: string, props?: any): Promise<string>
  setLoader(loader: RenderLoader): void
}

/**
 * Return a function that renders a Vue component to a HTML string.
 * The returned render function receives a path to a Vue component.
 * You need to specify Vite output directory of server build as same value as
 * defined in Vite config.
 */
export function createRender(options: RenderOptions = {}): RenderFunction {
  let loader: RenderLoader = {
    loadComponent(componentPath) {
      const serverOutDir = options.serverOutDir ?? defaultConfig.serverOutDir

      return import(
        /* @vite-ignore */ resolveServerDistPath(serverOutDir)
      ).then((m) => m[pathToExportName(componentPath)])
    },
  }

  async function loadComponent(componentPath: string): Promise<Component> {
    return loader.loadComponent(componentPath)
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
