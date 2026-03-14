// oxlint-disable typescript/no-unsafe-type-assertion
import fs from 'node:fs'
import path from 'node:path'

import { createServer, type RunnableDevEnvironment, type ViteDevServer } from 'vite'
import { afterEach, beforeEach, describe, expect, test } from 'vite-plus/test'

import { visle } from '../build/index.ts'
import { virtualIslandsBootstrapPath } from '../core/entry.ts'
import { createDevManifest } from './manifest.ts'

const generatedDir = path.resolve(import.meta.dirname, '../../test/__generated__/dev')

let root: string

beforeEach(() => {
  fs.mkdirSync(generatedDir, { recursive: true })
  root = fs.mkdtempSync(path.join(generatedDir, 'manifest-'))
  fs.mkdirSync(path.join(root, 'src/pages'), { recursive: true })
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

    const result = await manifest.getClientImportId('src/pages/foo.vue')

    expect(result).toBe('/src/pages/foo.vue')
  })

  test('return empty id array for css without <style>', async () => {
    fs.writeFileSync(path.join(root, 'src/pages/foo.vue'), '<template><div></div></template>')

    const s = await createTestServer()
    const manifest = createDevManifest(s)

    const result = await manifest.getEntryCssIds('foo')

    expect(result).toEqual([])
  })

  test('return ids for <style> blocks in code', async () => {
    const code = '<template><div></div></template><style scoped>h1 { color: red; }</style>'
    fs.writeFileSync(path.join(root, 'src/pages/foo.vue'), code)

    const s = await createTestServer()
    const manifest = createDevManifest(s)

    const result = await manifest.getEntryCssIds('foo')

    expect(result).toEqual([
      expect.stringMatching(
        /^\/src\/pages\/foo\.vue\?vue&type=style&index=0&scoped=[\da-f]+&lang\.css$/,
      ),
    ])
  })

  test('return ids for <style> block as css module', async () => {
    const code = '<template><div></div></template><style module>h1 { color: red; }</style>'
    fs.writeFileSync(path.join(root, 'src/pages/foo.vue'), code)

    const s = await createTestServer()
    const manifest = createDevManifest(s)

    const result = await manifest.getEntryCssIds('foo')

    expect(result).toEqual(['/src/pages/foo.vue?vue&type=style&index=0&lang.module.css'])
  })

  test('return ids for <style src> blocks', async () => {
    const code = '<template><div></div></template><style src="./foo.css"></style>'
    fs.writeFileSync(path.join(root, 'src/pages/foo.vue'), code)
    fs.writeFileSync(path.join(root, 'src/pages/foo.css'), 'h1 { color: red; }')

    const s = await createTestServer()
    const manifest = createDevManifest(s)

    const result = await manifest.getEntryCssIds('foo')

    expect(result).toEqual(['/src/pages/foo.css?vue&type=style&index=0&src=true&lang.css'])
  })

  test('return ids for <style src> blocks with scoped', async () => {
    const code = '<template><div></div></template><style src="./foo.css" scoped></style>'
    fs.writeFileSync(path.join(root, 'src/pages/foo.vue'), code)
    fs.writeFileSync(path.join(root, 'src/pages/foo.css'), 'h1 { color: red; }')

    const s = await createTestServer()
    const manifest = createDevManifest(s)

    const result = await manifest.getEntryCssIds('foo')

    expect(result).toEqual([
      expect.stringMatching(
        /^\/src\/pages\/foo\.css\?vue&type=style&index=0&src=[\da-f]+&scoped=[\da-f]+&lang\.css$/,
      ),
    ])
  })

  test('resolve non-relative <style src> path via resolveId', async () => {
    const code = '<template><div></div></template><style src="@/styles/foo.css"></style>'
    fs.writeFileSync(path.join(root, 'src/pages/foo.vue'), code)
    fs.mkdirSync(path.join(root, 'src/pages/styles'), { recursive: true })
    fs.writeFileSync(path.join(root, 'src/pages/styles/foo.css'), 'h1 { color: red; }')

    const s = await createTestServer({
      resolve: {
        alias: { '@': path.join(root, 'src/pages') },
      },
    })
    const manifest = createDevManifest(s)

    const result = await manifest.getEntryCssIds('foo')

    expect(result).toEqual(['/src/pages/styles/foo.css?vue&type=style&index=0&src=true&lang.css'])
  })

  test('fall back to raw src value when resolveId returns undefined', async () => {
    const code = '<template><div></div></template><style src="unknown-package/style.css"></style>'
    fs.writeFileSync(path.join(root, 'src/pages/foo.vue'), code)

    const s = await createTestServer()
    const manifest = createDevManifest(s)

    const result = await manifest.getEntryCssIds('foo')

    expect(result).toEqual(['/unknown-package/style.css?vue&type=style&index=0&src=true&lang.css'])
  })

  test('return url with path part of base', async () => {
    const s = await createTestServer({ base: 'https://example.com/prefix' })
    const manifest = createDevManifest(s)

    const result = await manifest.getClientImportId('src/pages/foo.vue')

    expect(result).toBe('/prefix/src/pages/foo.vue')
  })

  test('return url with specified dev server origin', async () => {
    const s = await createTestServer({ serverOrigin: 'http://localhost:3000' })
    const manifest = createDevManifest(s)

    const result = await manifest.getClientImportId('src/pages/foo.vue')

    expect(result).toBe('http://localhost:3000/src/pages/foo.vue')
  })

  test('getEntryCssIds collects CSS transitively from module graph', async () => {
    const childCode =
      '<template><div></div></template><script setup>const a = 1</script><style>h1 { color: red; }</style>'
    const parentCode =
      '<template><Child /></template><script setup>import Child from "./child.vue"</script>'
    fs.writeFileSync(path.join(root, 'src/pages/child.vue'), childCode)
    fs.writeFileSync(path.join(root, 'src/pages/parent.vue'), parentCode)

    const s = await createTestServer()
    const serverEnv = s.environments.server as RunnableDevEnvironment

    // Load the module via SSR runner to populate the server module graph
    await serverEnv.runner.import(path.join(root, 'src/pages/parent.vue'))

    const manifest = createDevManifest(s)
    const result = await manifest.getEntryCssIds('parent')

    // Child has one style block
    expect(result).toEqual(['/src/pages/child.vue?vue&type=style&index=0&lang.css'])
  })

  test('getEntryCssIds collects CSS imported in <script setup>', async () => {
    const code = '<template><div></div></template><script setup>import "./foo.css"</script>'
    fs.writeFileSync(path.join(root, 'src/pages/foo.vue'), code)
    fs.writeFileSync(path.join(root, 'src/pages/foo.css'), 'h1 { color: red; }')

    const s = await createTestServer()
    const serverEnv = s.environments.server as RunnableDevEnvironment

    // Load the module via SSR runner to populate the server module graph
    await serverEnv.runner.import(path.join(root, 'src/pages/foo.vue'))

    const manifest = createDevManifest(s)
    const result = await manifest.getEntryCssIds('foo')

    expect(result).toEqual(['/src/pages/foo.css'])
  })

  test('getEntryCssIds preserves discovery order of standalone CSS and Vue styles', async () => {
    fs.writeFileSync(
      path.join(root, 'src/pages/child-a.vue'),
      '<template><div></div></template><script setup>const a = 1</script><style>h1 { color: red; }</style>',
    )
    fs.writeFileSync(path.join(root, 'src/pages/middle.css'), 'h2 { color: blue; }')
    fs.writeFileSync(
      path.join(root, 'src/pages/child-b.vue'),
      '<template><div></div></template><script setup>const b = 1</script><style>h3 { color: green; }</style>',
    )
    // parent imports child-a, then middle.css, then child-b — in that order
    fs.writeFileSync(
      path.join(root, 'src/pages/parent.vue'),
      '<template><ChildA /><ChildB /></template><script setup>import ChildA from "./child-a.vue"\nimport "./middle.css"\nimport ChildB from "./child-b.vue"</script>',
    )

    const s = await createTestServer()
    const serverEnv = s.environments.server as RunnableDevEnvironment

    await serverEnv.runner.import(path.join(root, 'src/pages/parent.vue'))

    const manifest = createDevManifest(s)
    const result = await manifest.getEntryCssIds('parent')

    // Order must match import discovery: child-a style, middle.css, child-b style
    expect(result).toEqual([
      expect.stringMatching(/^\/src\/pages\/child-a\.vue\?vue&type=style&index=0&lang\.css$/),
      '/src/pages/middle.css',
      expect.stringMatching(/^\/src\/pages\/child-b\.vue\?vue&type=style&index=0&lang\.css$/),
    ])
  })

  test('getEntryCssIds deduplicates CSS ids when multiple components share the same style src', async () => {
    // Two components reference the same unscoped <style src="./shared.css">
    fs.writeFileSync(
      path.join(root, 'src/pages/child-a.vue'),
      '<template><div></div></template><script setup>const a = 1</script><style src="./shared.css"></style>',
    )
    fs.writeFileSync(
      path.join(root, 'src/pages/child-b.vue'),
      '<template><div></div></template><script setup>const b = 1</script><style src="./shared.css"></style>',
    )
    fs.writeFileSync(path.join(root, 'src/pages/shared.css'), 'h1 { color: red; }')
    fs.writeFileSync(
      path.join(root, 'src/pages/parent.vue'),
      '<template><ChildA /><ChildB /></template><script setup>import ChildA from "./child-a.vue"\nimport ChildB from "./child-b.vue"</script>',
    )

    const s = await createTestServer()
    const serverEnv = s.environments.server as RunnableDevEnvironment

    await serverEnv.runner.import(path.join(root, 'src/pages/parent.vue'))

    const manifest = createDevManifest(s)
    const result = await manifest.getEntryCssIds('parent')

    // The shared CSS should appear only once, not duplicated
    expect(result).toEqual(['/src/pages/shared.css?vue&type=style&index=0&src=true&lang.css'])
  })

  test('getEntryCssIds falls back to file parsing when entry is not in module graph', async () => {
    fs.writeFileSync(
      path.join(root, 'src/pages/foo.vue'),
      '<template><div></div></template><style>h1 { color: red; }</style>',
    )

    const s = await createTestServer()
    const manifest = createDevManifest(s)

    // foo is not in the module graph (never transformed), falls back to parsing
    const result = await manifest.getEntryCssIds('foo')

    expect(result).toEqual(['/src/pages/foo.vue?vue&type=style&index=0&lang.css'])
  })
})
