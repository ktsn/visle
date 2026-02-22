import { Component, createApp } from 'vue'
import { renderToString } from 'vue/server-renderer'

import { defaultConfig } from '../build/config.js'
import { pathToExportName, resolveServerDistPath } from '../build/paths.js'
import { RuntimeManifest, loadManifest } from './manifest.js'
import { transformWithRenderContext } from './transform.js'

export interface RenderOptions {
  serverOutDir?: string
  base?: string
}

export interface RenderLoader {
  loadComponent(componentPath: string): Promise<Component>
  manifest?: RuntimeManifest
}

export interface RenderContext {
  loadCss?: Set<string>
  loadJs?: Set<string>
  manifest?: RuntimeManifest
}

export interface RenderFunction {
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
  let cachedManifest: RuntimeManifest | undefined

  let loader: RenderLoader = {
    loadComponent(componentPath) {
      const serverOutDir = options.serverOutDir ?? defaultConfig.serverOutDir

      return import(/* @vite-ignore */ resolveServerDistPath(serverOutDir)).then(
        (m) => m[pathToExportName(componentPath)],
      )
    },
  }

  function getManifest(): RuntimeManifest {
    if (loader.manifest) {
      return loader.manifest
    }

    if (!cachedManifest) {
      const serverOutDir = options.serverOutDir ?? defaultConfig.serverOutDir
      const base = options.base ?? '/'
      cachedManifest = loadManifest(serverOutDir, base)
    }
    return cachedManifest
  }

  async function loadComponent(componentPath: string): Promise<Component> {
    return loader.loadComponent(componentPath)
  }

  async function render(componentPath: string, props?: any): Promise<string> {
    const component = await loadComponent(componentPath)

    const context: RenderContext = {
      manifest: getManifest(),
    }

    const app = createApp(component, props)
    const rendered = await renderToString(app, context)

    return transformWithRenderContext(rendered, context)
  }

  render.setLoader = (newLoader: RenderLoader) => {
    loader = newLoader
  }

  return render
}
