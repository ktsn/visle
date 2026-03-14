import { describe, expect, test } from 'vite-plus/test'

import { transformWithRenderContext } from './transform.ts'

describe('transform rendered html', () => {
  test('prepend if the html is incomplete', () => {
    const html = '<div>Hello</div>'

    const result = transformWithRenderContext(html, { css: ['style.css'], js: [] })

    expect(result).toBe('<link rel="stylesheet" href="style.css"><div>Hello</div>')
  })

  test('append into the end of a head element', () => {
    const html = '<html><head><title>Hello</title></head></html>'

    const result = transformWithRenderContext(html, { css: ['style.css'], js: [] })

    expect(result).toBe(
      '<html><head><title>Hello</title><link rel="stylesheet" href="style.css"></head></html>',
    )
  })

  test('insert before a body element', () => {
    const html = '<html><body><div>Hello</div></body></html>'

    const result = transformWithRenderContext(html, { css: ['style.css'], js: [] })

    expect(result).toBe(
      '<html><link rel="stylesheet" href="style.css"><body><div>Hello</div></body></html>',
    )
  })

  test('insert before a body element with an attribute', () => {
    const html = '<html><body class="dark"><div>Hello</div></body></html>'

    const result = transformWithRenderContext(html, { css: ['style.css'], js: [] })

    expect(result).toBe(
      '<html><link rel="stylesheet" href="style.css"><body class="dark"><div>Hello</div></body></html>',
    )
  })
})
