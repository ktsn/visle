import fs from 'node:fs/promises'
import path from 'node:path'
import { describe, test, expect, beforeEach } from 'vitest'

import { visle } from '../../src/build/index.ts'
import { createDevLoader } from '../../src/server/dev.ts'
import { createRender } from '../../src/server/render.ts'

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
    const tmpDir = path.resolve('test/__generated__/server')
    root = path.join(tmpDir, `islands-test-${Math.random()}`)
    await fs.rm(root, { recursive: true, force: true })
    await fs.mkdir(root, { recursive: true })
  })

  describe('isDev = false', () => {
    const emptyManifest = JSON.stringify({ cssMap: {}, entryCss: [], jsMap: {} })

    test('renders vue component with props', async () => {
      const render = createRender({
        serverOutDir: path.join(root, 'dist/server'),
      })

      await saveCodes(root, {
        'dist/server/visle-manifest.json': emptyManifest,
        'dist/server/server-entry.js': `
          import { defineComponent, h } from 'vue'
          export const _Comp = defineComponent({
            props: {
              msg: {
                type: String,
                required: true,
              },
            },
            render() {
              return h('div', {}, [this.msg])
            },
          })`,
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
          export const _Comp = defineComponent({
            render() {
              return h('div', {}, ['Hello'])
            },
          })`,
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
          export const _Comp = defineComponent({
            render() {
              return h('div', {}, ['Hello'])
            },
          })`,
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
          export const _Comp = defineComponent({
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
          })`,
      })

      const result = await render('Comp')

      expect(result).toBe(
        '<html><head><title>Hello</title><meta charset="utf-8"><link rel="stylesheet" href="style.css"><style>body { color: red; }</style><script src="script.js"></script><script>console.log(&#39;Hello&#39;)</script></head></html>',
      )
    })
  })

  describe('isDev = true', () => {
    test('renders vue component from component directory', async () => {
      const render = createRender({
        serverOutDir: path.join(root, 'dist/server'),
      })

      render.setLoader(
        createDevLoader({
          root,
          plugins: [visle()],
        }),
      )

      await saveCodes(root, {
        'pages/Comp.vue': `
          <template>
            <div>Hello</div>
          </template>`,
      })

      const result = await render('Comp')

      expect(result).toBe('<div>Hello</div>')
    })
  })
})
