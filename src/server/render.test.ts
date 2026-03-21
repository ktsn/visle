import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterEach, describe, test, expect, beforeEach } from 'vite-plus/test'

import { visle } from '../build/index.ts'
import { createDevLoader } from '../dev/index.ts'
import { createRender } from './render.ts'

const generatedDir = path.resolve(import.meta.dirname, '../../test/__generated__/server')

/**
 * Save JavaScript code provided as the argument.
 *
 * @param root
 *   The root directory to save the codes.
 * @param codes
 *   JavaScript codes that will be saved.
 *   Keys are relative paths to be saved. Values are code strings.
 */
async function saveCodes(root: string, codes: Record<string, string>): Promise<void> {
  // Save each component code to a file
  const promises = Object.entries(codes).map(async ([filePath, code]) => {
    const fullPath = path.join(root, filePath)
    const dirPath = path.dirname(fullPath)
    await fs.mkdir(dirPath, { recursive: true })
    await fs.writeFile(fullPath, code, 'utf8')
  })

  await Promise.all(promises)
}

describe('createRender', () => {
  let root: string

  beforeEach(async () => {
    await fs.mkdir(generatedDir, { recursive: true })
    root = await fs.mkdtemp(path.join(generatedDir, 'render-'))
  })

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true })
  })

  describe('isDev = false', () => {
    const emptyManifest = JSON.stringify({
      base: '/',
      entryDir: 'src/pages',
      cssMap: {},
      jsMap: {},
    })

    test('renders vue component with props', async () => {
      const render = createRender({
        serverOutDir: path.join(root, 'dist/server'),
      })

      await saveCodes(root, {
        'dist/server/visle-manifest.json': emptyManifest,
        'dist/server/server-entry.js': `
          import { defineComponent, h } from 'vue'
          export default { Comp: defineComponent({
            props: {
              msg: {
                type: String,
                required: true,
              },
            },
            render() {
              return h('div', {}, [this.msg])
            },
          }) }`,
      })

      const result = await render('Comp', { msg: 'Hello' })

      expect(result).toBe('<div>Hello</div>')
    })

    test('renders vue component without props', async () => {
      const render = createRender({
        serverOutDir: path.join(root, 'dist/server'),
      })

      await saveCodes(root, {
        'dist/server/visle-manifest.json': emptyManifest,
        'dist/server/server-entry.js': `
          import { defineComponent, h } from 'vue'
          export default { Comp: defineComponent({
            render() {
              return h('div', {}, ['Hello'])
            },
          }) }`,
      })

      const result = await render('Comp')

      expect(result).toBe('<div>Hello</div>')
    })

    test('renders vue component from .mjs file', async () => {
      const render = createRender({
        serverOutDir: path.join(root, 'dist/server'),
      })

      await saveCodes(root, {
        'dist/server/visle-manifest.json': emptyManifest,
        'dist/server/server-entry.mjs': `
          import { defineComponent, h } from 'vue'
          export default { Comp: defineComponent({
            render() {
              return h('div', {}, ['Hello'])
            },
          }) }`,
      })

      const result = await render('Comp')

      expect(result).toBe('<div>Hello</div>')
    })

    test('renders head related tags', async () => {
      const render = createRender({
        serverOutDir: path.join(root, 'dist/server'),
      })

      await saveCodes(root, {
        'dist/server/visle-manifest.json': emptyManifest,
        'dist/server/server-entry.js': `
          import { defineComponent, h } from 'vue'
          export default { Comp: defineComponent({
            render() {
              return h('html', {}, [
                h('head', {}, [
                  h('title', {}, ['Hello']),
                  h('meta', { charset: 'utf-8' }),
                  h('link', { rel: 'stylesheet', href: 'style.css' }),
                  h('style', {}, ['body { color: red; }']),
                  h('script', { src: 'script.js' }),
                  h('script', {}, ["console.log('Hello')"]),
                ]),
              ])
            },
          }) }`,
      })

      const result = await render('Comp')

      expect(result).toBe(
        '<html><head><title>Hello</title><meta charset="utf-8"><link rel="stylesheet" href="style.css"><style>body { color: red; }</style><script src="script.js"></script><script>console.log(&#39;Hello&#39;)</script></head></html>',
      )
    })
  })

  describe('isDev = true', () => {
    let loader: ReturnType<typeof createDevLoader> | undefined

    afterEach(async () => {
      await loader?.close()
      loader = undefined
    })

    test('renders vue component from component directory', async () => {
      const render = createRender({
        serverOutDir: path.join(root, 'dist/server'),
      })

      loader = createDevLoader({
        root,
        plugins: [visle()],
        resolve: {
          alias: {
            'visle/internal': path.resolve(
              path.dirname(fileURLToPath(import.meta.url)),
              'internal.ts',
            ),
          },
        },
      })

      render.setLoader(loader)

      await saveCodes(root, {
        'src/pages/Comp.vue': `
          <template>
            <div>Hello</div>
          </template>`,
      })

      const result = await render('Comp')

      expect(result).toBe('<div>Hello</div>')
    })
  })
})
