import fs from 'node:fs'
import path from 'node:path'

import { createServer, type RunnableDevEnvironment, type ViteDevServer } from 'vite'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'

import { visle } from '../build/index.ts'
import { virtualIslandsBootstrapPath } from '../build/paths.ts'
import { manifestFileName } from '../build/plugins/manifest.ts'
import { createDevManifest, loadManifest } from './manifest.ts'

const generatedDir = path.resolve(import.meta.dirname, '../../test/__generated__/server')

let root: string

beforeEach(() => {
  fs.mkdirSync(generatedDir, { recursive: true })
  root = fs.mkdtempSync(path.join(generatedDir, 'manifest-'))
  fs.mkdirSync(path.join(root, 'pages'), { recursive: true })
})

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true })
})

describe('createDevManifest', () => {
  let server: ViteDevServer | undefined

  afterEach(async () => {
    await server?.close()
    server = undefined
  })

  async function createTestServer(
    options: {
      base?: string
      serverOrigin?: string
      resolve?: { alias?: Record<string, string> }
    } = {},
  ) {
    server = await createServer({
      configFile: false,
      root,
      base: options.base ?? '/',
      plugins: [visle()],
      resolve: options.resolve,
      appType: 'custom',
      server: {
        middlewareMode: true,
        origin: options.serverOrigin,
      },
      optimizeDeps: { noDiscovery: true },
      logLevel: 'silent',
    })
    return server
  }

  test('get islands bootstrap path as virtual path', async () => {
    const s = await createTestServer()
    const manifest = createDevManifest(s)

    const result = await manifest.getIslandsBootstrapId()

    expect(result).toBe(virtualIslandsBootstrapPath)
  })

  test('get a relative path from the root directory', async () => {
    const s = await createTestServer()
    const manifest = createDevManifest(s)

    const result = await manifest.getClientImportId('pages/foo.vue')

    expect(result).toBe('/pages/foo.vue')
  })

  test('return empty id array for css without <style>', async () => {
    fs.writeFileSync(path.join(root, 'pages/foo.vue'), '<template><div></div></template>')

    const s = await createTestServer()
    const manifest = createDevManifest(s)

    const result = await manifest.getEntryCssIds('foo')

    expect(result).toEqual([])
  })

  test('return ids for <style> blocks in code', async () => {
    const code = '<template><div></div></template><style scoped>h1 { color: red; }</style>'
    fs.writeFileSync(path.join(root, 'pages/foo.vue'), code)

    const s = await createTestServer()
    const manifest = createDevManifest(s)

    const result = await manifest.getEntryCssIds('foo')

    expect(result).toEqual([
      expect.stringMatching(
        /^\/pages\/foo\.vue\?vue&type=style&index=0&scoped=[\da-f]+&lang\.css$/,
      ),
    ])
  })

  test('return ids for <style> block as css module', async () => {
    const code = '<template><div></div></template><style module>h1 { color: red; }</style>'
    fs.writeFileSync(path.join(root, 'pages/foo.vue'), code)

    const s = await createTestServer()
    const manifest = createDevManifest(s)

    const result = await manifest.getEntryCssIds('foo')

    expect(result).toEqual(['/pages/foo.vue?vue&type=style&index=0&lang.module.css'])
  })

  test('return ids for <style src> blocks', async () => {
    const code = '<template><div></div></template><style src="./foo.css"></style>'
    fs.writeFileSync(path.join(root, 'pages/foo.vue'), code)
    fs.writeFileSync(path.join(root, 'pages/foo.css'), 'h1 { color: red; }')

    const s = await createTestServer()
    const manifest = createDevManifest(s)

    const result = await manifest.getEntryCssIds('foo')

    expect(result).toEqual(['/pages/foo.css?vue&type=style&index=0&src=true&lang.css'])
  })

  test('return ids for <style src> blocks with scoped', async () => {
    const code = '<template><div></div></template><style src="./foo.css" scoped></style>'
    fs.writeFileSync(path.join(root, 'pages/foo.vue'), code)
    fs.writeFileSync(path.join(root, 'pages/foo.css'), 'h1 { color: red; }')

    const s = await createTestServer()
    const manifest = createDevManifest(s)

    const result = await manifest.getEntryCssIds('foo')

    expect(result).toEqual([
      expect.stringMatching(
        /^\/pages\/foo\.css\?vue&type=style&index=0&src=[\da-f]+&scoped=[\da-f]+&lang\.css$/,
      ),
    ])
  })

  test('resolve non-relative <style src> path via resolveId', async () => {
    const code = '<template><div></div></template><style src="@/styles/foo.css"></style>'
    fs.writeFileSync(path.join(root, 'pages/foo.vue'), code)
    fs.mkdirSync(path.join(root, 'pages/styles'), { recursive: true })
    fs.writeFileSync(path.join(root, 'pages/styles/foo.css'), 'h1 { color: red; }')

    const s = await createTestServer({
      resolve: {
        alias: { '@': path.join(root, 'pages') },
      },
    })
    const manifest = createDevManifest(s)

    const result = await manifest.getEntryCssIds('foo')

    expect(result).toEqual(['/pages/styles/foo.css?vue&type=style&index=0&src=true&lang.css'])
  })

  test('fall back to raw src value when resolveId returns undefined', async () => {
    const code = '<template><div></div></template><style src="unknown-package/style.css"></style>'
    fs.writeFileSync(path.join(root, 'pages/foo.vue'), code)

    const s = await createTestServer()
    const manifest = createDevManifest(s)

    const result = await manifest.getEntryCssIds('foo')

    expect(result).toEqual(['/unknown-package/style.css?vue&type=style&index=0&src=true&lang.css'])
  })

  test('return url with path part of base', async () => {
    const s = await createTestServer({ base: 'https://example.com/prefix' })
    const manifest = createDevManifest(s)

    const result = await manifest.getClientImportId('pages/foo.vue')

    expect(result).toBe('/prefix/pages/foo.vue')
  })

  test('return url with specified dev server origin', async () => {
    const s = await createTestServer({ serverOrigin: 'http://localhost:3000' })
    const manifest = createDevManifest(s)

    const result = await manifest.getClientImportId('pages/foo.vue')

    expect(result).toBe('http://localhost:3000/pages/foo.vue')
  })

  test('getEntryCssIds collects CSS transitively from module graph', async () => {
    const childCode =
      '<template><div></div></template><script setup>const a = 1</script><style>h1 { color: red; }</style>'
    const parentCode =
      '<template><Child /></template><script setup>import Child from "./child.vue"</script>'
    fs.writeFileSync(path.join(root, 'pages/child.vue'), childCode)
    fs.writeFileSync(path.join(root, 'pages/parent.vue'), parentCode)

    const s = await createTestServer()
    const serverEnv = s.environments.server as RunnableDevEnvironment

    // Load the module via SSR runner to populate the server module graph
    await serverEnv.runner.import(path.join(root, 'pages/parent.vue'))

    const manifest = createDevManifest(s)
    const result = await manifest.getEntryCssIds('parent')

    // Child has one style block
    expect(result).toEqual(['/pages/child.vue?vue&type=style&index=0&lang.css'])
  })

  test('getEntryCssIds falls back to file parsing when entry is not in module graph', async () => {
    fs.writeFileSync(
      path.join(root, 'pages/foo.vue'),
      '<template><div></div></template><style>h1 { color: red; }</style>',
    )

    const s = await createTestServer()
    const manifest = createDevManifest(s)

    // foo is not in the module graph (never transformed), falls back to parsing
    const result = await manifest.getEntryCssIds('foo')

    expect(result).toEqual(['/pages/foo.vue?vue&type=style&index=0&lang.css'])
  })
})

describe('loadManifest', () => {
  function writeManifest(data: {
    base?: string
    entryDir?: string
    cssMap?: Record<string, string[]>
    jsMap?: Record<string, string>
  }): void {
    fs.writeFileSync(
      path.join(root, manifestFileName),
      JSON.stringify({
        base: '/',
        entryDir: 'pages',
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

    const manifest = await loadManifest(root)
    const result = await manifest.getClientImportId('src/foo.vue')

    expect(result).toBe('/foo-1234.js')
  })

  test('throw error if js map does not include passed file path', async () => {
    writeManifest({
      jsMap: {},
    })

    const manifest = await loadManifest(root)

    await expect(manifest.getClientImportId('src/foo.vue')).rejects.toThrow(
      'src/foo.vue not found in manifest JS map',
    )
  })

  test('get entry css ids from css map', async () => {
    writeManifest({
      cssMap: { 'pages/foo.vue': ['foo-1234.css'] },
    })

    const manifest = await loadManifest(root)
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

    const manifest = await loadManifest(root)
    const result = await manifest.getClientImportId('src/foo.vue')

    expect(result).toBe(expected)
  })

  test('getEntryCssIds uses entryDir from manifest data', async () => {
    writeManifest({
      entryDir: 'views',
      cssMap: { 'views/index.vue': ['index-1234.css'] },
    })

    const manifest = await loadManifest(root)
    const result = await manifest.getEntryCssIds('index')

    expect(result).toEqual(['/index-1234.css'])
  })
})
