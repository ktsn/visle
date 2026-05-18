import { describe, expect, test } from 'vite-plus/test'

import { componentWrapPrefix } from './generate.js'
import { hasEntryExt, parseId, stripEntryExt } from './paths.js'

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

  test('filters empty name segments', () => {
    expect(parseId('/foo/bar.vue?names=A,,B')).toEqual({
      fileName: '/foo/bar.vue',
      query: { names: ['A', 'B'] },
      prefix: undefined,
    })
  })
})

describe('hasEntryExt', () => {
  test('matches single extension', () => {
    expect(hasEntryExt('/foo/bar.vue', ['.vue'])).toBe(true)
  })

  test('matches one of multiple extensions', () => {
    expect(hasEntryExt('/foo/bar.md', ['.vue', '.md'])).toBe(true)
  })

  test('returns false for non-matching extension', () => {
    expect(hasEntryExt('/foo/bar.ts', ['.vue', '.md'])).toBe(false)
  })
})

describe('stripEntryExt', () => {
  test('strips matching extension', () => {
    expect(stripEntryExt('foo/bar.vue', ['.vue'])).toBe('foo/bar')
  })

  test('strips first matching extension from multiple', () => {
    expect(stripEntryExt('foo/bar.md', ['.vue', '.md'])).toBe('foo/bar')
  })

  test('returns path unchanged if no extension matches', () => {
    expect(stripEntryExt('foo/bar.ts', ['.vue', '.md'])).toBe('foo/bar.ts')
  })
})
