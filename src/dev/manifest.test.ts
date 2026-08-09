import fs from 'node:fs'
import path from 'node:path'

import { createServer, type ViteDevServer } from 'vite'
import { afterEach, beforeEach, describe, expect, test } from 'vite-plus/test'

import { visle } from '../build/index.ts'
import { islandsBootstrapPath, viteDevClientPath } from '../shared/entry.ts'
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

  async function createTestServer(options: { base?: string; serverOrigin?: string } = {}) {
    server = await createServer({
      configFile: false,
      root,
      base: options.base ?? '/',
      plugins: [visle()],
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

  function writeEntry(relativePath: string): void {
    const filePath = path.join(root, 'src/pages', relativePath)
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.writeFileSync(filePath, '<template><div /></template>\n<style>.page { color: red }</style>')
  }

  test('returns the Vite development client without the islands bootstrap', async () => {
    const manifest = createDevManifest(await createTestServer())

    await expect(manifest.getBootstrapJsIds(false)).resolves.toEqual([viteDevClientPath])
  })

  test('returns the Vite development client and islands bootstrap for an island page', async () => {
    const manifest = createDevManifest(await createTestServer())

    await expect(manifest.getBootstrapJsIds(true)).resolves.toEqual([
      viteDevClientPath,
      islandsBootstrapPath,
    ])
  })

  test('returns source paths for client imports', async () => {
    const manifest = createDevManifest(await createTestServer())

    await expect(manifest.getClientImportId('src/pages/foo.vue')).resolves.toBe(
      '/src/pages/foo.vue',
    )
  })

  test('returns styles discovered from the entry component', async () => {
    writeEntry('nested/index.vue')
    const manifest = createDevManifest(await createTestServer())

    await expect(manifest.getEntryCssIds('nested/index')).resolves.toEqual([
      '/src/pages/nested/index.vue?vue&type=style&index=0&lang.css',
    ])
  })

  test('applies the configured base path to development assets', async () => {
    writeEntry('foo.vue')
    const manifest = createDevManifest(
      await createTestServer({ base: 'https://example.com/prefix' }),
    )

    await expect(manifest.getEntryCssIds('foo')).resolves.toEqual([
      '/prefix/src/pages/foo.vue?vue&type=style&index=0&lang.css',
    ])
  })

  test('applies the configured dev server origin to development assets', async () => {
    writeEntry('foo.vue')
    const manifest = createDevManifest(
      await createTestServer({ serverOrigin: 'http://localhost:3000' }),
    )

    await expect(manifest.getEntryCssIds('foo')).resolves.toEqual([
      'http://localhost:3000/src/pages/foo.vue?vue&type=style&index=0&lang.css',
    ])
  })

  test('applies the configured base and origin to the Vite development client', async () => {
    const manifest = createDevManifest(
      await createTestServer({
        base: '/prefix/',
        serverOrigin: 'http://localhost:3000',
      }),
    )

    await expect(manifest.getBootstrapJsIds(false)).resolves.toEqual([
      'http://localhost:3000/prefix/@vite/client',
    ])
  })
})
