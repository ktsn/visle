import { describe, expect, it } from 'vitest'

import { isCSS } from './module-id.js'

describe('isCSS', () => {
  it.each(['.css', '.scss', '.sass', '.postcss', '.pcss', '.less', '.stylus', '.styl'])(
    'matches %s extension',
    (ext) => {
      expect(isCSS(`/foo/bar${ext}`)).toBe(true)
    },
  )

  it('matches with query string', () => {
    expect(isCSS('/foo/bar.css?used')).toBe(true)
  })

  it('does not match non-CSS extension', () => {
    expect(isCSS('/foo/bar.ts')).toBe(false)
    expect(isCSS('/foo/bar.vue')).toBe(false)
    expect(isCSS('/foo/bar.js')).toBe(false)
  })

  it('does not match partial extension', () => {
    expect(isCSS('/foo/bar.cssx')).toBe(false)
  })

  it('matches Vue style block module id with lang query', () => {
    expect(isCSS('/foo/bar.vue?vue&type=style&index=0&lang.css')).toBe(true)
    expect(isCSS('/foo/bar.vue?vue&type=style&index=0&scoped=abc123&lang.scss')).toBe(true)
  })

  it('does not match Vue style block module id without lang query', () => {
    expect(isCSS('/foo/bar.vue?vue&type=style&index=0')).toBe(false)
  })
})
