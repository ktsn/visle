import { describe, test, expect } from 'vitest'

import { generateEntryTypesCode } from './generate.ts'

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
