import { type Component, createApp } from 'vue'
import { renderToString } from 'vue/server-renderer'

import type { RuntimeManifest } from './manifest.js'
import { transformWithRenderContext } from './transform.js'

export interface RenderOptions {
  loader?: RenderLoader
}

export interface RenderLoader {
  loadEntry: (componentPath: string) => Promise<Component>
  getManifest: () => Promise<RuntimeManifest>
}

export interface RenderContext {
  manifest?: RuntimeManifest
  hasIsland?: boolean
}

export type RenderArgs<P> = {} extends P ? [props?: P] : [props: P]

export interface RenderFunction<T extends Record<keyof T, unknown> = Record<string, unknown>> {
  <K extends string & keyof T>(componentPath: K, ...args: RenderArgs<T[K]>): Promise<string>
  setLoader(loader: RenderLoader): void
}

/**
 * Return a function that renders a Vue component to a HTML string.
 * The returned render function receives a path to a Vue component.
 * A loader can be provided initially or installed later with `setLoader()`.
 */
export function createRender<T extends Record<keyof T, unknown> = Record<string, unknown>>(
  options: RenderOptions = {},
): RenderFunction<T> {
  let loader = options.loader

  async function render(componentPath: string, props?: any): Promise<string> {
    const activeLoader = loader
    if (!activeLoader) {
      throw new Error(
        '[visle] Render loader is not configured. Call render.setLoader(loader) before rendering.',
      )
    }

    const component = await activeLoader.loadEntry(componentPath)

    const context: RenderContext = {
      manifest: await activeLoader.getManifest(),
    }

    const app = createApp(component, props)
    const rendered = await renderToString(app, context)

    const manifest = context.manifest!

    // Collect CSS for the page entry after rendering so module graph is populated
    const css = await manifest.getEntryCssIds(componentPath)

    const js = await manifest.getBootstrapJsIds(context.hasIsland ?? false)

    return transformWithRenderContext(rendered, { css, js })
  }

  render.setLoader = (newLoader: RenderLoader) => {
    loader = newLoader
  }

  return render as RenderFunction<T>
}
