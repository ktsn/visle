import { describe, expect, test } from 'vite-plus/test'

import type { ManifestSource } from '../shared/manifest.ts'
import { createRuntimeManifest } from './manifest.ts'

function createManifestSource(data: Partial<ManifestSource> = {}): ManifestSource {
  return {
    base: '/',
    entryDir: 'src/pages',
    entryExt: ['.vue'],
    cssMap: {},
    jsMap: {},
    islandsBootstrap: 'assets/islands.js',
    ...data,
  }
}

describe('createRuntimeManifest', () => {
  test('gets a file path derived from the JS map', async () => {
    const manifest = createRuntimeManifest(
      createManifestSource({ jsMap: { 'src/foo.vue': 'foo-1234.js' } }),
    )

    await expect(manifest.getClientImportId('src/foo.vue')).resolves.toBe('/foo-1234.js')
  })

  test('resolves a lazy JS map value', async () => {
    const manifest = createRuntimeManifest(
      createManifestSource({
        jsMap: { 'src/foo.vue': async () => 'foo-1234.js' },
      }),
    )

    await expect(manifest.getClientImportId('src/foo.vue')).resolves.toBe('/foo-1234.js')
  })

  test('throws if the JS map does not include the file path', async () => {
    const manifest = createRuntimeManifest(createManifestSource())

    await expect(manifest.getClientImportId('src/foo.vue')).rejects.toThrow(
      'src/foo.vue not found in manifest JS map',
    )
  })

  test.for([
    ['https://example.com/prefix', 'https://example.com/prefix/foo-1234.js'],
    ['/prefix', '/prefix/foo-1234.js'],
  ] as const)('prepends base to file path: %s', async ([base, expected]) => {
    const manifest = createRuntimeManifest(
      createManifestSource({
        base,
        jsMap: { 'src/foo.vue': 'foo-1234.js' },
      }),
    )

    await expect(manifest.getClientImportId('src/foo.vue')).resolves.toBe(expected)
  })

  test('uses the configured entry directory', async () => {
    const manifest = createRuntimeManifest(
      createManifestSource({
        entryDir: 'views',
        cssMap: { 'views/index.vue': ['index-1234.css'] },
      }),
    )

    await expect(manifest.getEntryCssIds('index')).resolves.toEqual(['/index-1234.css'])
  })

  test('resolves a lazy CSS map value', async () => {
    const manifest = createRuntimeManifest(
      createManifestSource({
        cssMap: { 'src/pages/index.vue': async () => ['index-1234.css'] },
      }),
    )

    await expect(manifest.getEntryCssIds('index')).resolves.toEqual(['/index-1234.css'])
  })

  test('resolves custom entry extensions', async () => {
    const manifest = createRuntimeManifest(
      createManifestSource({
        entryExt: ['.vue', '.md'],
        cssMap: { 'src/pages/post.md': ['post-1234.css'] },
      }),
    )

    await expect(manifest.getEntryCssIds('post')).resolves.toEqual(['/post-1234.css'])
  })

  test('returns an empty CSS list when no extension matches', async () => {
    const manifest = createRuntimeManifest(createManifestSource())

    await expect(manifest.getEntryCssIds('nonexistent')).resolves.toEqual([])
  })

  test('gets the islands bootstrap path', async () => {
    const manifest = createRuntimeManifest(
      createManifestSource({ base: '/shop/', islandsBootstrap: 'assets/islands-1234.js' }),
    )

    await expect(manifest.getIslandsBootstrapId()).resolves.toBe('/shop/assets/islands-1234.js')
  })
})
