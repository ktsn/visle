// oxlint-disable typescript/no-unsafe-type-assertion
import fs from 'node:fs'
import path from 'node:path'

import { createServer, type ViteDevServer } from 'vite'
import { afterEach, beforeEach, describe, expect, test } from 'vite-plus/test'

import { visle } from '../build/index.ts'
import { getServerEnvironment } from './index.ts'
import { collectDevEntryCssIds } from './style.ts'

const generatedDir = path.resolve(import.meta.dirname, '../../test/__generated__/dev')

let root: string

beforeEach(() => {
  fs.mkdirSync(generatedDir, { recursive: true })
  root = fs.mkdtempSync(path.join(generatedDir, 'style-'))
  fs.mkdirSync(path.join(root, 'src/pages'), { recursive: true })
})

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true })
})

describe('collectDevEntryCssIds', () => {
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

  async function collect(componentPath: string): Promise<string[]> {
    const activeServer = server!
    return collectDevEntryCssIds(activeServer, getServerEnvironment(activeServer), componentPath)
  }

  test('returns an empty array when the entry has no styles', async () => {
    fs.writeFileSync(path.join(root, 'src/pages/foo.vue'), '<template><div /></template>')
    await createTestServer()

    await expect(collect('foo')).resolves.toEqual([])
  })

  test('extracts scoped and module style requests', async () => {
    fs.writeFileSync(
      path.join(root, 'src/pages/foo.vue'),
      '<template><div /></template><style scoped>h1 { color: red; }</style><style module>h2 { color: blue; }</style>',
    )
    await createTestServer()

    const result = await collect('foo')

    expect(result).toEqual([
      expect.stringMatching(
        /^\/src\/pages\/foo\.vue\?vue&type=style&index=0&scoped=[\da-f]+&lang\.css$/,
      ),
      '/src/pages/foo.vue?vue&type=style&index=1&lang.module.css',
    ])
  })

  test('extracts relative and aliased style sources', async () => {
    fs.mkdirSync(path.join(root, 'src/styles'), { recursive: true })
    fs.writeFileSync(path.join(root, 'src/styles/local.css'), 'h1 { color: red; }')
    fs.writeFileSync(path.join(root, 'src/styles/alias.css'), 'h2 { color: blue; }')
    fs.writeFileSync(
      path.join(root, 'src/pages/foo.vue'),
      '<template><div /></template><style src="../styles/local.css"></style><style src="@/alias.css"></style>',
    )
    await createTestServer({ resolve: { alias: { '@': path.join(root, 'src/styles') } } })

    await expect(collect('foo')).resolves.toEqual([
      '/src/styles/local.css?vue&type=style&index=0&src=true&lang.css',
      '/src/styles/alias.css?vue&type=style&index=1&src=true&lang.css',
    ])
  })

  test('falls back to an unresolved non-relative style source', async () => {
    fs.writeFileSync(
      path.join(root, 'src/pages/foo.vue'),
      '<template><div /></template><style src="unknown-package/style.css"></style>',
    )
    await createTestServer()

    await expect(collect('foo')).resolves.toEqual([
      '/unknown-package/style.css?vue&type=style&index=0&src=true&lang.css',
    ])
  })

  test('collects Vue and standalone CSS transitively from the server graph', async () => {
    fs.writeFileSync(
      path.join(root, 'src/pages/child.vue'),
      '<template><div /></template><style>h1 { color: red; }</style>',
    )
    fs.writeFileSync(path.join(root, 'src/pages/shared.css'), 'h2 { color: blue; }')
    fs.writeFileSync(
      path.join(root, 'src/pages/parent.vue'),
      '<template><Child /></template><script setup>import Child from "./child.vue"\nimport "./shared.css"</script>',
    )
    const activeServer = await createTestServer()
    await getServerEnvironment(activeServer).runner.import(path.join(root, 'src/pages/parent.vue'))

    await expect(collect('parent')).resolves.toEqual([
      '/src/pages/child.vue?vue&type=style&index=0&lang.css',
      '/src/pages/shared.css',
    ])
  })

  test('preserves graph discovery order', async () => {
    fs.writeFileSync(
      path.join(root, 'src/pages/child-a.vue'),
      '<template><div /></template><style>h1 { color: red; }</style>',
    )
    fs.writeFileSync(path.join(root, 'src/pages/middle.css'), 'h2 { color: blue; }')
    fs.writeFileSync(
      path.join(root, 'src/pages/child-b.vue'),
      '<template><div /></template><style>h3 { color: green; }</style>',
    )
    fs.writeFileSync(
      path.join(root, 'src/pages/parent.vue'),
      '<template><ChildA /><ChildB /></template><script setup>import ChildA from "./child-a.vue"\nimport "./middle.css"\nimport ChildB from "./child-b.vue"</script>',
    )
    const activeServer = await createTestServer()
    await getServerEnvironment(activeServer).runner.import(path.join(root, 'src/pages/parent.vue'))

    await expect(collect('parent')).resolves.toEqual([
      '/src/pages/child-a.vue?vue&type=style&index=0&lang.css',
      '/src/pages/middle.css',
      '/src/pages/child-b.vue?vue&type=style&index=0&lang.css',
    ])
  })

  test('deduplicates shared style sources', async () => {
    fs.writeFileSync(path.join(root, 'src/pages/shared.css'), 'h1 { color: red; }')
    for (const name of ['child-a', 'child-b']) {
      fs.writeFileSync(
        path.join(root, `src/pages/${name}.vue`),
        '<template><div /></template><style src="./shared.css"></style>',
      )
    }
    fs.writeFileSync(
      path.join(root, 'src/pages/parent.vue'),
      '<template><ChildA /><ChildB /></template><script setup>import ChildA from "./child-a.vue"\nimport ChildB from "./child-b.vue"</script>',
    )
    const activeServer = await createTestServer()
    await getServerEnvironment(activeServer).runner.import(path.join(root, 'src/pages/parent.vue'))

    await expect(collect('parent')).resolves.toEqual([
      '/src/pages/shared.css?vue&type=style&index=0&src=true&lang.css',
    ])
  })

  test('falls back to parsing an entry before it reaches the module graph', async () => {
    fs.writeFileSync(
      path.join(root, 'src/pages/foo.vue'),
      '<template><div /></template><style>h1 { color: red; }</style>',
    )
    await createTestServer()

    await expect(collect('foo')).resolves.toEqual([
      '/src/pages/foo.vue?vue&type=style&index=0&lang.css',
    ])
  })

  test('returns CSS IDs without applying base paths or server origins', async () => {
    fs.writeFileSync(
      path.join(root, 'src/pages/foo.vue'),
      '<template><div /></template><style>h1 { color: red; }</style>',
    )
    await createTestServer({
      base: '/prefix/',
      serverOrigin: 'http://localhost:3000',
    })

    await expect(collect('foo')).resolves.toEqual([
      '/src/pages/foo.vue?vue&type=style&index=0&lang.css',
    ])
  })
})
