import { describe, expect, test } from 'vitest'

import { RenderContext } from '../../src/server/render.ts'
import { transformWithRenderContext } from '../../src/server/transform.ts'

describe('transform rendered html', () => {
  test('prepend if the html is incomplete', () => {
    const html = '<div>Hello</div>'
    const context: RenderContext = {
      loadCss: new Set(['style.css']),
    }

    const result = transformWithRenderContext(html, context)

    expect(result).toBe('<link rel="stylesheet" href="style.css"><div>Hello</div>')
  })

  test('append into the end of a head element', () => {
    const html = '<html><head><title>Hello</title></head></html>'
    const context: RenderContext = {
      loadCss: new Set(['style.css']),
    }

    const result = transformWithRenderContext(html, context)

    expect(result).toBe(
      '<html><head><title>Hello</title><link rel="stylesheet" href="style.css"></head></html>',
    )
  })

  test('insert before a body element', () => {
    const html = '<html><body><div>Hello</div></body></html>'
    const context: RenderContext = {
      loadCss: new Set(['style.css']),
    }

    const result = transformWithRenderContext(html, context)

    expect(result).toBe(
      '<html><link rel="stylesheet" href="style.css"><body><div>Hello</div></body></html>',
    )
  })

  test('insert before a body element with an attribute', () => {
    const html = '<html><body class="dark"><div>Hello</div></body></html>'
    const context: RenderContext = {
      loadCss: new Set(['style.css']),
    }

    const result = transformWithRenderContext(html, context)

    expect(result).toBe(
      '<html><link rel="stylesheet" href="style.css"><body class="dark"><div>Hello</div></body></html>',
    )
  })
})
