import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, test } from 'vitest'

import { customElementEntryPath, virtualCustomElementEntryPath } from '../../src/build/paths.ts'
import { manifestFileName } from '../../src/build/plugins/manifest.ts'
import { createDevManifest, loadManifest } from '../../src/server/manifest.ts'

describe('createDevManifest', () => {
  let root: string

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'visle-test-'))
    fs.mkdirSync(path.join(root, 'src'), { recursive: true })
  })

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true })
  })

  test('get custom element entry path as virtual path', () => {
    const manifest = createDevManifest({
      root,
      base: '/',
      server: {},
      isProduction: false,
    })

    const relativePath = path.relative(root, customElementEntryPath)
    const result = manifest.getClientImportId(relativePath)

    expect(result).toBe(virtualCustomElementEntryPath)
  })

  test('get a relative path from the root directory', () => {
    const manifest = createDevManifest({
      root,
      base: '/',
      server: {},
      isProduction: false,
    })

    const result = manifest.getClientImportId('src/foo.vue')

    expect(result).toBe('/src/foo.vue')
  })

  test('return empty id array for css without <style>', () => {
    fs.writeFileSync(path.join(root, 'src/foo.vue'), '<template><div></div></template>')

    const manifest = createDevManifest({
      root,
      base: '/',
      server: {},
      isProduction: false,
    })

    const result = manifest.getDependingClientCssIds('src/foo.vue')

    expect(result).toEqual([])
  })

  test('return ids for <style> blocks in code', () => {
    const code = '<template><div></div></template><style scoped>h1 { color: red; }</style>'
    fs.writeFileSync(path.join(root, 'src/foo.vue'), code)

    const manifest = createDevManifest({
      root,
      base: '/',
      server: {},
      isProduction: false,
    })

    const result = manifest.getDependingClientCssIds('src/foo.vue')

    expect(result).toEqual([
      expect.stringMatching(/^\/src\/foo\.vue\?vue&type=style&index=0&scoped=[\da-f]+&lang\.css$/),
    ])
  })

  test('return ids for <style> block as css module', () => {
    const code = '<template><div></div></template><style module>h1 { color: red; }</style>'
    fs.writeFileSync(path.join(root, 'src/foo.vue'), code)

    const manifest = createDevManifest({
      root,
      base: '/',
      server: {},
      isProduction: false,
    })

    const result = manifest.getDependingClientCssIds('src/foo.vue')

    expect(result).toEqual(['/src/foo.vue?vue&type=style&index=0&lang.module.css'])
  })

  test('return url with path part of base', () => {
    const manifest = createDevManifest({
      root,
      base: 'https://example.com/prefix',
      server: {},
      isProduction: false,
    })

    const result = manifest.getClientImportId('src/foo.vue')

    expect(result).toBe('/prefix/src/foo.vue')
  })

  test('return url with specified dev server origin', () => {
    const manifest = createDevManifest({
      root,
      base: '/',
      server: {
        origin: 'http://localhost:3000',
      },
      isProduction: false,
    })

    const result = manifest.getClientImportId('src/foo.vue')

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

  test('get file path derived from js map', () => {
    writeManifest({
      jsMap: { 'src/foo.vue': 'foo-1234.js' },
    })

    const manifest = loadManifest(serverOutDir, '/')
    const result = manifest.getClientImportId('src/foo.vue')

    expect(result).toBe('/foo-1234.js')
  })

  test('throw error if js map does not include passed file path', () => {
    writeManifest({
      jsMap: {},
    })

    const manifest = loadManifest(serverOutDir, '/')

    expect(() => {
      manifest.getClientImportId('src/foo.vue')
    }).toThrow('src/foo.vue not found in manifest JS map')
  })

  test('get depending css ids from css map', () => {
    writeManifest({
      cssMap: { 'src/foo.vue': ['foo-1234.css'] },
    })

    const manifest = loadManifest(serverOutDir, '/')
    const result = manifest.getDependingClientCssIds('src/foo.vue')

    expect(result).toEqual(['/foo-1234.css'])
  })

  test('return entry css when css map does not have the component', () => {
    writeManifest({
      cssMap: {},
      entryCss: ['entry-1234.css'],
    })

    const manifest = loadManifest(serverOutDir, '/')
    const result = manifest.getDependingClientCssIds('src/foo.vue')

    expect(result).toEqual(['/entry-1234.css'])
  })

  test.for([
    ['https://example.com/prefix', 'https://example.com/prefix/foo-1234.js'],
    ['/prefix', '/prefix/foo-1234.js'],
  ] as const)('prepend base to file path: %s', ([base, expected]) => {
    writeManifest({
      jsMap: { 'src/foo.vue': 'foo-1234.js' },
    })

    const manifest = loadManifest(serverOutDir, base)
    const result = manifest.getClientImportId('src/foo.vue')

    expect(result).toBe(expected)
  })
})
