// @vitest-environment happy-dom
import { describe, expect, test, vi, beforeEach } from 'vitest'
import { createSSRApp } from 'vue'

import { VueIsland } from './custom-element.ts'

vi.mock('vue', () => ({
  createSSRApp: vi.fn(() => ({
    mount: vi.fn(),
    unmount: vi.fn(),
  })),
}))

vi.mock('./load-module.ts', () => ({
  loadModule: vi.fn(() => Promise.resolve({ default: { name: 'TestComponent' } })),
}))

function createIsland(attrs?: Record<string, string>): VueIsland {
  const el = new VueIsland()
  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      el.setAttribute(key, value)
    }
  }
  return el
}

function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

describe('VueIsland custom element', () => {
  beforeEach(() => {
    vi.mocked(createSSRApp).mockClear()
    document.body.innerHTML = ''
  })

  describe('constructor', () => {
    test('creates shadow root with style and slot', () => {
      const el = createIsland()
      expect(el.shadowRoot).not.toBeNull()
      expect(el.shadowRoot!.querySelector('style')?.textContent).toBe(':host{display:contents}')
      expect(el.shadowRoot!.querySelector('slot')).not.toBeNull()
    })
  })

  describe('connectedCallback', () => {
    test('does not mount when entry attribute is missing', async () => {
      const el = createIsland()
      document.body.appendChild(el)
      await flushMicrotasks()
      expect(createSSRApp).not.toHaveBeenCalled()
    })

    test('imports entry and mounts app', async () => {
      const el = createIsland({ entry: './test-entry' })
      document.body.appendChild(el)
      await flushMicrotasks()

      expect(createSSRApp).toHaveBeenCalledWith({ name: 'TestComponent' }, {})
      const app = vi.mocked(createSSRApp).mock.results[0]!.value
      expect(app.mount).toHaveBeenCalledWith(el)
    })

    test('passes parsed props from serialized-props attribute', async () => {
      const el = createIsland({
        entry: './test-entry',
        'serialized-props': '{"msg":"hello","count":42}',
      })
      document.body.appendChild(el)
      await flushMicrotasks()

      expect(createSSRApp).toHaveBeenCalledWith(
        { name: 'TestComponent' },
        { msg: 'hello', count: 42 },
      )
    })

    test('falls back to empty object on invalid JSON in serialized-props', async () => {
      const el = createIsland({ entry: './test-entry', 'serialized-props': '{invalid' })
      document.body.appendChild(el)
      await flushMicrotasks()

      expect(createSSRApp).toHaveBeenCalledWith({ name: 'TestComponent' }, {})
    })

    test('falls back to empty object when serialized-props is a non-object JSON value', async () => {
      const el = createIsland({ entry: './test-entry', 'serialized-props': '"string"' })
      document.body.appendChild(el)
      await flushMicrotasks()

      expect(createSSRApp).toHaveBeenCalledWith({ name: 'TestComponent' }, {})
    })

    test('does not mount if disconnected during import', async () => {
      const el = createIsland({ entry: './test-entry' })
      document.body.appendChild(el)
      document.body.removeChild(el)
      await flushMicrotasks()

      expect(createSSRApp).not.toHaveBeenCalled()
    })

    test('unmounts previous app when connectedCallback is re-invoked', async () => {
      const el = createIsland({ entry: './test-entry' })
      document.body.appendChild(el)
      await flushMicrotasks()

      const firstApp = vi.mocked(createSSRApp).mock.results[0]!.value
      vi.mocked(createSSRApp).mockClear()

      // Manually re-invoke connectedCallback (simulates re-adoption without prior disconnect)
      ;(el as any).connectedCallback()
      await flushMicrotasks()

      expect(firstApp.unmount).toHaveBeenCalled()
      expect(createSSRApp).toHaveBeenCalledTimes(1)
    })
  })

  describe('disconnectedCallback', () => {
    test('unmounts the app on disconnect', async () => {
      const el = createIsland({ entry: './test-entry' })
      document.body.appendChild(el)
      await flushMicrotasks()

      const app = vi.mocked(createSSRApp).mock.results[0]!.value
      document.body.removeChild(el)

      expect(app.unmount).toHaveBeenCalled()
    })

    test('does not throw when no app exists', async () => {
      const el = createIsland()
      document.body.appendChild(el)
      await flushMicrotasks()

      expect(() => document.body.removeChild(el)).not.toThrow()
    })
  })
})
