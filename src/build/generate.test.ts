import { describe, test, expect } from 'vitest'

import { buildIslandWrapId, generateEntryTypesCode, parseIslandWrapId } from './generate.ts'

describe('generateEntryTypesCode', () => {
  test('generates module augmentation with component entries', () => {
    const entryDir = '/project/pages'
    const root = '/project'
    const componentIds = ['/project/pages/static.vue', '/project/pages/with-props.vue']

    const result = generateEntryTypesCode(entryDir, root, componentIds)

    expect(result).toContain(
      "'static': ComponentProps<typeof import('./pages/static.vue')['default']>",
    )
    expect(result).toContain(
      "'with-props': ComponentProps<typeof import('./pages/with-props.vue')['default']>",
    )
  })

  test('handles nested components', () => {
    const entryDir = '/project/pages'
    const root = '/project'
    const componentIds = ['/project/pages/nested/index.vue']

    const result = generateEntryTypesCode(entryDir, root, componentIds)

    expect(result).toContain(
      "'nested/index': ComponentProps<typeof import('./pages/nested/index.vue')['default']>",
    )
  })

  test('handles empty component list', () => {
    const result = generateEntryTypesCode('/project/pages', '/project', [])

    expect(result).toContain("declare module 'visle'")
    expect(result).toContain("import type { ComponentProps } from 'visle'")
    expect(result).toContain('interface VisleEntries {\n\n  }')
  })

  test('include empty export', () => {
    const result = generateEntryTypesCode('/project/pages', '/project', [])

    expect(result).toContain('export {}')
  })
})

describe('buildIslandWrapId', () => {
  test('builds id with load strategy', () => {
    const id = buildIslandWrapId('load', '/path/to/Comp.vue')
    expect(id).toBe('\0visle:island-wrap:load:/path/to/Comp.vue')
  })

  test('builds id with visible strategy', () => {
    const id = buildIslandWrapId('visible', '/path/to/Comp.vue')
    expect(id).toBe('\0visle:island-wrap:visible:/path/to/Comp.vue')
  })
})

describe('parseIslandWrapId', () => {
  test('parses load strategy id', () => {
    const result = parseIslandWrapId('\0visle:island-wrap:load:/path/to/Comp.vue')
    expect(result).toEqual({ strategy: 'load', filePath: '/path/to/Comp.vue' })
  })

  test('parses visible strategy id', () => {
    const result = parseIslandWrapId('\0visle:island-wrap:visible:/path/to/Comp.vue')
    expect(result).toEqual({ strategy: 'visible', filePath: '/path/to/Comp.vue' })
  })

  test('returns undefined for non-island-wrap id', () => {
    const result = parseIslandWrapId('\0visle:server-wrap:/path/to/Comp.vue')
    expect(result).toBeUndefined()
  })

  test('returns undefined for id without strategy separator', () => {
    const result = parseIslandWrapId('\0visle:island-wrap:')
    expect(result).toBeUndefined()
  })

  test('roundtrips with buildIslandWrapId', () => {
    const id = buildIslandWrapId('visible', '/project/components/Counter.vue')
    const parsed = parseIslandWrapId(id)
    expect(parsed).toEqual({ strategy: 'visible', filePath: '/project/components/Counter.vue' })
  })
})
