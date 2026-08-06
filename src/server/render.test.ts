import { describe, expect, test } from 'vite-plus/test'
import { defineComponent, h, type Component } from 'vue'

import type { ManifestSource } from '../shared/manifest.ts'
import { createBundleLoader } from './bundle-loader.ts'
import { createRender, type RenderLoader } from './render.ts'

const emptyManifest: ManifestSource = {
  base: '/',
  entryDir: 'src/pages',
  entryExt: ['.vue'],
  cssMap: {},
  jsMap: {},
  islandsBootstrap: 'assets/islands.js',
}

function loaderFor(component: Component): RenderLoader {
  return createBundleLoader({ entries: { Comp: () => component }, manifest: emptyManifest })
}

describe('createRender', () => {
  test('throws a targeted error before a loader is configured', async () => {
    const render = createRender()

    await expect(render('Comp')).rejects.toThrow(
      '[visle] Render loader is not configured. Call render.setLoader(loader) before rendering.',
    )
  })

  test('uses a loader passed during initialization', async () => {
    const component = defineComponent({
      props: { msg: { type: String, required: true } },
      render() {
        return h('div', this.msg)
      },
    })
    const render = createRender({ loader: loaderFor(component) })

    await expect(render('Comp', { msg: 'Hello' })).resolves.toBe('<div>Hello</div>')
  })

  test('setLoader enables rendering after shared initialization', async () => {
    const render = createRender()
    render.setLoader(
      loaderFor(
        defineComponent({
          render: () => h('div', 'Hello'),
        }),
      ),
    )

    await expect(render('Comp')).resolves.toBe('<div>Hello</div>')
  })

  test('replaces the configured loader', async () => {
    const render = createRender({
      loader: loaderFor(defineComponent({ render: () => h('div', 'first') })),
    })
    render.setLoader(loaderFor(defineComponent({ render: () => h('div', 'second') })))

    await expect(render('Comp')).resolves.toBe('<div>second</div>')
  })

  test('injects a configured development client without an island', async () => {
    const render = createRender({
      loader: createBundleLoader({
        entries: { Comp: () => defineComponent({ render: () => h('div', 'Hello') }) },
        manifest: { ...emptyManifest, devClient: '/@vite/client' },
      }),
    })

    await expect(render('Comp')).resolves.toBe(
      '<script type="module" src="/@vite/client" async></script><div>Hello</div>',
    )
  })

  test('renders head-related tags', async () => {
    const render = createRender({
      loader: loaderFor(
        defineComponent({
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
        }),
      ),
    })

    await expect(render('Comp')).resolves.toBe(
      '<html><head><title>Hello</title><meta charset="utf-8"><link rel="stylesheet" href="style.css"><style>body { color: red; }</style><script src="script.js"></script><script>console.log(&#39;Hello&#39;)</script></head></html>',
    )
  })
})
