import { createApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { transformWithRenderContext } from './transform.js'

interface VueComponent<Props> {
  new (): {
    $props: Props
  }
}

type CanEmpty<T> = Record<never, unknown> extends T ? T : never

export interface Render {
  <Props>(component: VueComponent<CanEmpty<Props>>): Promise<string>
  <Props>(component: VueComponent<Props>, props: Props): Promise<string>
}

export interface RenderContext {
  loadCss?: Set<string>
  loadJs?: Set<string>
}

export const render: Render = async (
  component: VueComponent<unknown>,
  props?: any,
): Promise<string> => {
  const context: RenderContext = {}

  const app = createApp(component, props)
  const rendered = await renderToString(app, context)

  return transformWithRenderContext(rendered, context)
}
