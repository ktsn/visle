import { describe, test, expect } from 'vite-plus/test'

import { asAbs } from '../shared/path.ts'
import { generateEntryTypesCode } from './generate.ts'

describe('generateEntryTypesCode', () => {
  test('generates module augmentation with component entries', () => {
    const entryDir = asAbs('/project/pages')
    const dtsDir = asAbs('/project')
    const componentIds = [
      asAbs('/project/pages/static.vue'),
      asAbs('/project/pages/with-props.vue'),
    ]

    const result = generateEntryTypesCode(entryDir, dtsDir, componentIds)

    expect(result).toContain(
      "'static': ComponentProps<typeof import('./pages/static.vue')['default']>",
    )
    expect(result).toContain(
      "'with-props': ComponentProps<typeof import('./pages/with-props.vue')['default']>",
    )
  })

  test('handles nested components', () => {
    const entryDir = asAbs('/project/pages')
    const dtsDir = asAbs('/project')
    const componentIds = [asAbs('/project/pages/nested/index.vue')]

    const result = generateEntryTypesCode(entryDir, dtsDir, componentIds)

    expect(result).toContain(
      "'nested/index': ComponentProps<typeof import('./pages/nested/index.vue')['default']>",
    )
  })

  test('handles empty component list', () => {
    const result = generateEntryTypesCode(asAbs('/project/pages'), asAbs('/project'), [])

    expect(result).toContain("declare module 'visle'")
    expect(result).toContain("import type { ComponentProps } from 'visle'")
    expect(result).toContain('interface VisleEntries {\n\n  }')
  })

  test('generates import paths relative to dts directory', () => {
    const entryDir = asAbs('/project/pages')
    const dtsDir = asAbs('/project/types')
    const componentIds = [asAbs('/project/pages/static.vue')]

    const result = generateEntryTypesCode(entryDir, dtsDir, componentIds)

    expect(result).toContain(
      "'static': ComponentProps<typeof import('../pages/static.vue')['default']>",
    )
  })

  test('include empty export', () => {
    const result = generateEntryTypesCode(asAbs('/project/pages'), asAbs('/project'), [])

    expect(result).toContain('export {}')
  })
})
