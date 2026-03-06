import { describe, expect, test } from 'vitest'

import { componentWrapPrefix } from './generate.js'
import { parseId } from './paths.js'

describe('parseId', () => {
  test('plain file path', () => {
    expect(parseId('/foo/bar.vue')).toEqual({
      fileName: '/foo/bar.vue',
      query: {},
      prefix: undefined,
    })
  })

  test('with ?vue query', () => {
    expect(parseId('/foo/bar.vue?vue&type=script')).toEqual({
      fileName: '/foo/bar.vue',
      query: { vue: true },
      prefix: undefined,
    })
  })

  test('with prefix', () => {
    expect(parseId(`${componentWrapPrefix}/foo/bar.vue`)).toEqual({
      fileName: '/foo/bar.vue',
      query: {},
      prefix: componentWrapPrefix,
    })
  })

  test('with prefix and names', () => {
    expect(parseId(`${componentWrapPrefix}/foo/bar.vue?names=default,Foo`)).toEqual({
      fileName: '/foo/bar.vue',
      query: { names: ['default', 'Foo'] },
      prefix: componentWrapPrefix,
    })
  })

  test('names without prefix', () => {
    expect(parseId('/foo/bar.vue?names=A,B')).toEqual({
      fileName: '/foo/bar.vue',
      query: { names: ['A', 'B'] },
      prefix: undefined,
    })
  })
})
