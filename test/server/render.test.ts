import { describe, test, expect } from 'vitest'
import { defineComponent, h } from 'vue'
import { render } from '../../src/server/render.ts'

describe('render', () => {
  test('renders vue component with props', async () => {
    const Comp = defineComponent({
      props: {
        msg: {
          type: String,
          required: true,
        },
      },
      render() {
        return h('div', {}, [this.msg])
      },
    })

    const result = await render(Comp, { msg: 'Hello' })

    expect(result).toBe('<div>Hello</div>')
  })

  test('renders vue component without props', async () => {
    const Comp = defineComponent({
      render() {
        return h('div', {}, ['Hello'])
      },
    })

    const result = await render(Comp)

    expect(result).toBe('<div>Hello</div>')
  })

  test('renders head related tags', async () => {
    const Comp = defineComponent({
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
    })

    const result = await render(Comp)

    expect(result).toBe(
      '<html><head><title>Hello</title><meta charset="utf-8"><link rel="stylesheet" href="style.css"><style>body { color: red; }</style><script src="script.js"></script><script>console.log(&#39;Hello&#39;)</script></head></html>',
    )
  })
})
