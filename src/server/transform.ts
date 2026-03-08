export interface Injection {
  css: string[]
  js: string[]
}

export function transformWithRenderContext(html: string, injection: Injection): string {
  const injecting = createInjectingHtml(injection)
  const point = findInjectionPoint(html)

  return html.slice(0, point) + injecting + html.slice(point)
}

function createInjectingHtml(injection: Injection): string {
  let injecting = ''

  for (const href of injection.css) {
    injecting += `<link rel="stylesheet" href="${href}">`
  }

  for (const src of injection.js) {
    injecting += `<script type="module" src="${src}" async></script>`
  }

  return injecting
}

function findInjectionPoint(html: string): number {
  const point = html.search(/(?:<\/head>|<body[\s>])/i)
  return point < 0 ? 0 : point
}
