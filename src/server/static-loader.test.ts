import { describe, expect, test } from 'vite-plus/test'
import { defineComponent } from 'vue'

import type { ManifestData } from '../shared/manifest.ts'
import { createStaticLoader } from './static-loader.ts'

const manifest: ManifestData = {
  base: '/',
  entryDir: 'src/pages',
  entryExt: ['.vue'],
  cssMap: {},
  jsMap: {},
  islandsBootstrap: 'assets/islands.js',
}

describe('createStaticLoader', () => {
  test('resolves known entries and reuses one runtime manifest', async () => {
    const component = defineComponent({ template: '<div />' })
    const loader = createStaticLoader({ entries: { index: component }, manifest })

    await expect(loader.loadEntry('index')).resolves.toBe(component)
    await expect(loader.getManifest()).resolves.toBe(await loader.getManifest())
  })

  test('rejects unknown entries with a descriptive error', async () => {
    const loader = createStaticLoader({ entries: {}, manifest })

    await expect(loader.loadEntry('missing')).rejects.toThrow(
      '[visle] Unknown entry component: missing',
    )
  })
})
