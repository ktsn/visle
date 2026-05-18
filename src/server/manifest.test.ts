import fs from 'node:fs'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, test } from 'vite-plus/test'

import { manifestFileName } from '../shared/manifest.ts'
import { asAbs } from '../shared/path.ts'
import { loadManifest } from './manifest.ts'

const generatedDir = path.resolve(import.meta.dirname, '../../test/__generated__/server')

let root: string

beforeEach(() => {
  fs.mkdirSync(generatedDir, { recursive: true })
  root = fs.mkdtempSync(path.join(generatedDir, 'manifest-'))
})

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true })
})

describe('loadManifest', () => {
  function writeManifest(data: {
    base?: string
    entryDir?: string
    entryExt?: string[]
    cssMap?: Record<string, string[]>
    jsMap?: Record<string, string>
  }): void {
    fs.writeFileSync(
      path.join(root, manifestFileName),
      JSON.stringify({
        base: '/',
        entryDir: 'src/pages',
        entryExt: ['.vue'],
        cssMap: {},
        jsMap: {},
        ...data,
      }),
    )
  }

  test('get file path derived from js map', async () => {
    writeManifest({
      jsMap: { 'src/foo.vue': 'foo-1234.js' },
    })

    const manifest = await loadManifest(asAbs(root))
    const result = await manifest.getClientImportId('src/foo.vue')

    expect(result).toBe('/foo-1234.js')
  })

  test('throw error if js map does not include passed file path', async () => {
    writeManifest({
      jsMap: {},
    })

    const manifest = await loadManifest(asAbs(root))

    await expect(manifest.getClientImportId('src/foo.vue')).rejects.toThrow(
      'src/foo.vue not found in manifest JS map',
    )
  })

  test('get entry css ids from css map', async () => {
    writeManifest({
      cssMap: { 'src/pages/foo.vue': ['foo-1234.css'] },
    })

    const manifest = await loadManifest(asAbs(root))
    const result = await manifest.getEntryCssIds('foo')

    expect(result).toEqual(['/foo-1234.css'])
  })

  test.for([
    ['https://example.com/prefix', 'https://example.com/prefix/foo-1234.js'],
    ['/prefix', '/prefix/foo-1234.js'],
  ] as const)('prepend base to file path: %s', async ([base, expected]) => {
    writeManifest({
      base,
      jsMap: { 'src/foo.vue': 'foo-1234.js' },
    })

    const manifest = await loadManifest(asAbs(root))
    const result = await manifest.getClientImportId('src/foo.vue')

    expect(result).toBe(expected)
  })

  test('getEntryCssIds uses entryDir from manifest data', async () => {
    writeManifest({
      entryDir: 'views',
      cssMap: { 'views/index.vue': ['index-1234.css'] },
    })

    const manifest = await loadManifest(asAbs(root))
    const result = await manifest.getEntryCssIds('index')

    expect(result).toEqual(['/index-1234.css'])
  })

  test('getEntryCssIds resolves custom entry extension', async () => {
    writeManifest({
      entryExt: ['.vue', '.md'],
      cssMap: { 'src/pages/post.md': ['post-1234.css'] },
    })

    const manifest = await loadManifest(asAbs(root))
    const result = await manifest.getEntryCssIds('post')

    expect(result).toEqual(['/post-1234.css'])
  })

  test('getEntryCssIds returns empty array when no extension matches', async () => {
    writeManifest({
      entryExt: ['.vue'],
      cssMap: {},
    })

    const manifest = await loadManifest(asAbs(root))
    const result = await manifest.getEntryCssIds('nonexistent')

    expect(result).toEqual([])
  })
})
