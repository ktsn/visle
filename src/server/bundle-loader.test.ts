import { describe, expect, test } from 'vite-plus/test'
import { defineComponent } from 'vue'

import type { ManifestSource } from '../shared/manifest.ts'
import { createBundleLoader } from './bundle-loader.ts'

const manifest: ManifestSource = {
  base: '/',
  entryDir: 'src/pages',
  entryExt: ['.vue'],
  cssMap: {},
  jsMap: {},
  islandsBootstrap: 'assets/islands.js',
}

describe('createBundleLoader', () => {
  test('resolves synchronous entries and reuses one runtime manifest', async () => {
    const component = defineComponent({ template: '<div />' })
    const loader = createBundleLoader({ entries: { index: () => component }, manifest })

    await expect(loader.loadEntry('index')).resolves.toBe(component)
    await expect(loader.getManifest()).resolves.toBe(await loader.getManifest())
  })

  test('resolves asynchronous entries', async () => {
    const component = defineComponent({ template: '<div />' })
    const loader = createBundleLoader({
      entries: { index: async () => component },
      manifest,
    })

    await expect(loader.loadEntry('index')).resolves.toBe(component)
  })

  test.each(['missing', 'constructor', 'toString', 'valueOf'])(
    'rejects unknown entry %s with a descriptive error',
    async (componentPath) => {
      const loader = createBundleLoader({ entries: {}, manifest })

      await expect(loader.loadEntry(componentPath)).rejects.toThrow(
        `[visle] Unknown entry component: ${componentPath}`,
      )
    },
  )
})
