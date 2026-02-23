import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, test } from 'vitest'

import { customElementEntryPath, virtualCustomElementEntryPath } from '../build/paths.ts'
import { manifestFileName } from '../build/plugins/manifest.ts'
import { createDevManifest, loadManifest } from './manifest.ts'

describe('createDevManifest', () => {
  let root: string

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'visle-test-'))
    fs.mkdirSync(path.join(root, 'src'), { recursive: true })
  })

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true })
  })

  test('get custom element entry path as virtual path', async () => {
    const manifest = createDevManifest({
      root,
      base: '/',
      server: {},
    })

    const relativePath = path.relative(root, customElementEntryPath)
    const result = await manifest.getClientImportId(relativePath)

    expect(result).toBe(virtualCustomElementEntryPath)
  })

  test('get a relative path from the root directory', async () => {
    const manifest = createDevManifest({
      root,
      base: '/',
      server: {},
    })

    const result = await manifest.getClientImportId('src/foo.vue')

    expect(result).toBe('/src/foo.vue')
  })

  test('return empty id array for css without <style>', async () => {
    fs.writeFileSync(path.join(root, 'src/foo.vue'), '<template><div></div></template>')

    const manifest = createDevManifest({
      root,
      base: '/',
      server: {},
    })

    const result = await manifest.getDependingClientCssIds('src/foo.vue')

    expect(result).toEqual([])
  })

  test('return ids for <style> blocks in code', async () => {
    const code = '<template><div></div></template><style scoped>h1 { color: red; }</style>'
    fs.writeFileSync(path.join(root, 'src/foo.vue'), code)

    const manifest = createDevManifest({
      root,
      base: '/',
      server: {},
    })

    const result = await manifest.getDependingClientCssIds('src/foo.vue')

    expect(result).toEqual([
      expect.stringMatching(/^\/src\/foo\.vue\?vue&type=style&index=0&scoped=[\da-f]+&lang\.css$/),
    ])
  })

  test('return ids for <style> block as css module', async () => {
    const code = '<template><div></div></template><style module>h1 { color: red; }</style>'
    fs.writeFileSync(path.join(root, 'src/foo.vue'), code)

    const manifest = createDevManifest({
      root,
      base: '/',
      server: {},
    })

    const result = await manifest.getDependingClientCssIds('src/foo.vue')

    expect(result).toEqual(['/src/foo.vue?vue&type=style&index=0&lang.module.css'])
  })

  test('return url with path part of base', async () => {
    const manifest = createDevManifest({
      root,
      base: 'https://example.com/prefix',
      server: {},
    })

    const result = await manifest.getClientImportId('src/foo.vue')

    expect(result).toBe('/prefix/src/foo.vue')
  })

  test('return url with specified dev server origin', async () => {
    const manifest = createDevManifest({
      root,
      base: '/',
      server: {
        origin: 'http://localhost:3000',
      },
    })

    const result = await manifest.getClientImportId('src/foo.vue')

    expect(result).toBe('http://localhost:3000/src/foo.vue')
  })
})

describe('loadManifest', () => {
  let serverOutDir: string

  beforeEach(() => {
    serverOutDir = fs.mkdtempSync(path.join(os.tmpdir(), 'visle-test-'))
  })

  afterEach(() => {
    fs.rmSync(serverOutDir, { recursive: true, force: true })
  })

  function writeManifest(data: {
    cssMap?: Record<string, string[]>
    entryCss?: string[]
    jsMap?: Record<string, string>
  }): void {
    fs.writeFileSync(
      path.join(serverOutDir, manifestFileName),
      JSON.stringify({
        cssMap: {},
        entryCss: [],
        jsMap: {},
        ...data,
      }),
    )
  }

  test('get file path derived from js map', async () => {
    writeManifest({
      jsMap: { 'src/foo.vue': 'foo-1234.js' },
    })

    const manifest = await loadManifest(serverOutDir, '/')
    const result = await manifest.getClientImportId('src/foo.vue')

    expect(result).toBe('/foo-1234.js')
  })

  test('throw error if js map does not include passed file path', async () => {
    writeManifest({
      jsMap: {},
    })

    const manifest = await loadManifest(serverOutDir, '/')

    await expect(manifest.getClientImportId('src/foo.vue')).rejects.toThrow(
      'src/foo.vue not found in manifest JS map',
    )
  })

  test('get depending css ids from css map', async () => {
    writeManifest({
      cssMap: { 'src/foo.vue': ['foo-1234.css'] },
    })

    const manifest = await loadManifest(serverOutDir, '/')
    const result = await manifest.getDependingClientCssIds('src/foo.vue')

    expect(result).toEqual(['/foo-1234.css'])
  })

  test('return entry css when css map does not have the component', async () => {
    writeManifest({
      cssMap: {},
      entryCss: ['entry-1234.css'],
    })

    const manifest = await loadManifest(serverOutDir, '/')
    const result = await manifest.getDependingClientCssIds('src/foo.vue')

    expect(result).toEqual(['/entry-1234.css'])
  })

  test.for([
    ['https://example.com/prefix', 'https://example.com/prefix/foo-1234.js'],
    ['/prefix', '/prefix/foo-1234.js'],
  ] as const)('prepend base to file path: %s', async ([base, expected]) => {
    writeManifest({
      jsMap: { 'src/foo.vue': 'foo-1234.js' },
    })

    const manifest = await loadManifest(serverOutDir, base)
    const result = await manifest.getClientImportId('src/foo.vue')

    expect(result).toBe(expected)
  })
})
