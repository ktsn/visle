import { createApp } from 'vue'
import { renderToString } from 'vue/server-renderer'

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

interface RenderContext {
  loadCss?: Set<string>
  loadJs?: Set<string>
}

export const render: Render = async (
  component: VueComponent<unknown>,
  props?: any,
): Promise<string> => {
  const context: RenderContext = {}

  const app = createApp(component, props)
  let result = await renderToString(app, context)

  if (context.loadCss) {
    for (const href of context.loadCss) {
      result = `<link rel="stylesheet" href="${href}">\n${result}`
    }
  }

  if (context.loadJs) {
    for (const src of context.loadJs) {
      result += `\n<script type="module" src="${src}"></script>`
    }
  }

  return result
}
