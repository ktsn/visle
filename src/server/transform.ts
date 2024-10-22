import { RenderContext } from './render.js'

export function transformWithRenderContext(
  html: string,
  context: RenderContext,
): string {
  let transformed = html

  if (context.loadCss) {
    for (const href of context.loadCss) {
      transformed = `<link rel="stylesheet" href="${href}">${transformed}`
    }
  }

  if (context.loadJs) {
    for (const src of context.loadJs) {
      transformed += `<script type="module" src="${src}"></script>`
    }
  }

  return transformed
}
