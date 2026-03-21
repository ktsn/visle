import fs from 'node:fs/promises'
import path from 'node:path'

import { createObjectProperty, createSimpleExpression } from '@vue/compiler-core'
import { createServer, type ViteDevServer } from 'vite'
import { afterEach, beforeEach, describe, expect, test } from 'vite-plus/test'

import { defaultConfig, type ResolvedVisleConfig } from '../core/config.ts'
import { wrapVuePlugin } from './vue.ts'

const root = path.resolve(__dirname, '..', '..')
const tempDir = path.resolve(root, 'test/__generated__/server/vue-plugin')

describe('wrapVuePlugin', () => {
  let server: ViteDevServer | undefined
  const tempFiles: string[] = []

  beforeEach(async () => {
    await fs.mkdir(tempDir, { recursive: true })
  })

  async function createTestServer(config: ResolvedVisleConfig) {
    server = await createServer({
      configFile: false,
      plugins: [wrapVuePlugin(config)],
      appType: 'custom',
      server: { middlewareMode: true },
      optimizeDeps: { noDiscovery: true },
      logLevel: 'silent',
    })
    return server
  }

  async function writeTempVue(name: string, content: string): Promise<string> {
    const filePath = path.resolve(tempDir, `${name}.vue`)
    await fs.writeFile(filePath, content)
    tempFiles.push(filePath)
    return filePath
  }

  async function transform(filePath: string): Promise<string> {
    const result = await server!.environments.client.transformRequest(filePath.replace(root, ''))
    expect(result).not.toBeNull()
    return result!.code
  }

  afterEach(async () => {
    await server?.close()
    server = undefined
    await Promise.all(tempFiles.map((f) => fs.unlink(f).catch(() => {})))
    tempFiles.length = 0
  })

  test('additional custom element', async () => {
    await createTestServer({
      ...defaultConfig,
      vue: {
        template: {
          compilerOptions: {
            isCustomElement: (tag) => tag === 'my-element',
          },
        },
      },
    })

    const filePath = await writeTempVue(
      'custom-element',
      `<template><div><my-element /><vue-island /></div></template>`,
    )
    const code = await transform(filePath)

    // my-element should be treated as native (no resolveComponent call)
    expect(code).not.toContain('resolveComponent("my-element")')
    // vue-island should also be treated as native (Visle built-in)
    expect(code).not.toContain('resolveComponent("vue-island")')
  })

  test('additional directiveTransform', async () => {
    await createTestServer({
      ...defaultConfig,
      vue: {
        template: {
          compilerOptions: {
            directiveTransforms: {
              highlight: () => {
                return {
                  props: [
                    createObjectProperty(
                      createSimpleExpression('__test_highlight__', true),
                      createSimpleExpression('true', true),
                    ),
                  ],
                }
              },
            },
          },
        },
      },
    })

    const filePath = await writeTempVue(
      'directive',
      `<template><div v-highlight v-client /></template>`,
    )
    const code = await transform(filePath)

    // Custom directive transform should have been called
    expect(code).toContain('__test_highlight__')
    // Visle's client directive transform should still produce its output
    expect(code).toContain('__visle_strategy__')
  })

  test('additional compilerOptions', async () => {
    await createTestServer({
      ...defaultConfig,
      vue: {
        template: {
          compilerOptions: {
            whitespace: 'preserve',
            comments: false,
          },
        },
      },
    })

    const filePath = await writeTempVue(
      'compiler-options',
      `<template><div>  hello  <!-- greeting -->  world  </div></template>`,
    )
    const code = await transform(filePath)

    // whitespace: 'preserve' should keep whitespace as-is
    expect(code).toContain('  hello  ')
    // comments: true should keep HTML comments in the output
    expect(code).not.toContain('greeting')
  })

  test('additional feature', async () => {
    await createTestServer({
      ...defaultConfig,
      vue: {
        features: {
          customElement: /\.vue$/,
        },
      },
    })

    const filePath = await writeTempVue(
      'feature-ce',
      `<template>
  <div>Test</div>
</template>
<style>
div { color: red; }
</style>
`,
    )
    const code = await transform(filePath)

    // With customElement enabled, styles are attached as an inline array
    // on the component for shadow DOM injection instead of injected globally
    expect(code).toContain("'styles'")
    expect(code).toContain('_style_0')
  })
})
