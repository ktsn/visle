import { RenderContext } from './render.js'

export function transformWithRenderContext(
  html: string,
  context: RenderContext,
): string {
  const injecting = createInjectingHtml(context)
  const point = findInjectionPoint(html)

  return html.slice(0, point) + injecting + html.slice(point)
}

function createInjectingHtml(context: RenderContext): string {
  let injecting = ''

  if (context.loadCss) {
    for (const href of context.loadCss) {
      injecting += `<link rel="stylesheet" href="${href}">`
    }
  }

  if (context.loadJs) {
    for (const src of context.loadJs) {
      injecting += `<script type="module" src="${src}" async></script>`
    }
  }

  return injecting
}

function findInjectionPoint(html: string): number {
  const point = html.search(/(?:<\/head>|<body[\s>])/i)
  return point < 0 ? 0 : point
}
