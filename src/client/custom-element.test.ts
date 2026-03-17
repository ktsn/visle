// @vitest-environment happy-dom
// oxlint-disable typescript/no-unsafe-type-assertion
import { describe, expect, test, vi, beforeEach } from 'vite-plus/test'
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
      await el.connectedCallback()

      expect(firstApp.unmount).toHaveBeenCalled()
      expect(createSSRApp).toHaveBeenCalledTimes(1)
    })
  })

  describe('visible strategy', () => {
    let observeCallback: IntersectionObserverCallback
    let observeOptions: IntersectionObserverInit | undefined
    let mockDisconnect: ReturnType<typeof vi.fn>
    let mockObserve: ReturnType<typeof vi.fn>

    beforeEach(() => {
      mockDisconnect = vi.fn()
      mockObserve = vi.fn()

      class MockIntersectionObserver {
        constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
          observeCallback = callback
          observeOptions = options
        }

        observe = mockObserve
        disconnect = mockDisconnect
        unobserve = vi.fn()
      }

      vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
    })

    test('does not hydrate immediately when strategy is visible', async () => {
      const el = createIsland({ entry: './test-entry', strategy: 'visible' })
      document.body.appendChild(el)
      await flushMicrotasks()

      expect(createSSRApp).not.toHaveBeenCalled()
      expect(mockObserve).toHaveBeenCalledWith(el.firstElementChild ?? el)
    })

    test('hydrates when intersection fires', async () => {
      const el = createIsland({ entry: './test-entry', strategy: 'visible' })
      document.body.appendChild(el)
      await flushMicrotasks()

      expect(createSSRApp).not.toHaveBeenCalled()

      // Simulate intersection
      observeCallback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      )
      await flushMicrotasks()

      expect(mockDisconnect).toHaveBeenCalled()
      expect(createSSRApp).toHaveBeenCalledWith({ name: 'TestComponent' }, {})
    })

    test('cleans up observer on disconnect before visible', async () => {
      const el = createIsland({ entry: './test-entry', strategy: 'visible' })
      document.body.appendChild(el)
      await flushMicrotasks()

      // Disconnect before intersection fires
      document.body.removeChild(el)

      // Simulate late intersection
      observeCallback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      )
      await flushMicrotasks()

      expect(createSSRApp).not.toHaveBeenCalled()
    })

    test('passes rootMargin to IntersectionObserver from options attribute', async () => {
      const el = createIsland({
        entry: './test-entry',
        strategy: 'visible',
        options: '{"rootMargin":"200px"}',
      })
      document.body.appendChild(el)
      await flushMicrotasks()

      expect(observeOptions).toEqual({ rootMargin: '200px' })
    })

    test('does not pass rootMargin when options attribute is absent', async () => {
      const el = createIsland({ entry: './test-entry', strategy: 'visible' })
      document.body.appendChild(el)
      await flushMicrotasks()

      expect(observeOptions).toBeUndefined()
    })
  })

  describe('idle strategy', () => {
    let mockRequestIdleCallback: ReturnType<typeof vi.fn>
    let mockCancelIdleCallback: ReturnType<typeof vi.fn>

    beforeEach(() => {
      mockRequestIdleCallback = vi.fn((_cb: IdleRequestCallback) => {
        // Store callback but don't call it immediately
        return 42
      })
      mockCancelIdleCallback = vi.fn()

      vi.stubGlobal('requestIdleCallback', mockRequestIdleCallback)
      vi.stubGlobal('cancelIdleCallback', mockCancelIdleCallback)
    })

    test('hydrates when idle callback fires', async () => {
      const el = createIsland({ entry: './test-entry', strategy: 'idle' })
      document.body.appendChild(el)
      await flushMicrotasks()

      expect(createSSRApp).not.toHaveBeenCalled()

      // Fire the idle callback
      const idleCallback = mockRequestIdleCallback.mock.calls[0]![0] as () => void
      idleCallback()
      await flushMicrotasks()

      expect(createSSRApp).toHaveBeenCalledWith({ name: 'TestComponent' }, {})
    })

    test('cleans up on disconnect before idle fires', async () => {
      const el = createIsland({ entry: './test-entry', strategy: 'idle' })
      document.body.appendChild(el)
      await flushMicrotasks()

      document.body.removeChild(el)

      expect(mockCancelIdleCallback).toHaveBeenCalledWith(42)
    })

    test('passes timeout option from options attribute', async () => {
      const el = createIsland({
        entry: './test-entry',
        strategy: 'idle',
        options: '{"timeout":2000}',
      })
      document.body.appendChild(el)
      await flushMicrotasks()

      expect(mockRequestIdleCallback).toHaveBeenCalledWith(expect.any(Function), { timeout: 2000 })
    })

    test('falls back to load event + setTimeout when requestIdleCallback is unavailable', async () => {
      vi.stubGlobal('requestIdleCallback', undefined)

      // Simulate a loading document so the fallback waits for the load event
      Object.defineProperty(document, 'readyState', {
        value: 'loading',
        writable: true,
        configurable: true,
      })

      const el = createIsland({ entry: './test-entry', strategy: 'idle' })
      document.body.appendChild(el)
      await flushMicrotasks()

      expect(createSSRApp).not.toHaveBeenCalled()

      // Restore readyState and simulate load event
      Object.defineProperty(document, 'readyState', {
        value: 'complete',
        writable: true,
        configurable: true,
      })
      window.dispatchEvent(new Event('load'))
      await flushMicrotasks()

      expect(createSSRApp).toHaveBeenCalledWith({ name: 'TestComponent' }, {})
    })

    test('falls back to setTimeout immediately when requestIdleCallback is unavailable and document is already complete', async () => {
      vi.stubGlobal('requestIdleCallback', undefined)

      // document.readyState is already 'complete' in happy-dom by default
      const el = createIsland({ entry: './test-entry', strategy: 'idle' })
      document.body.appendChild(el)
      await flushMicrotasks()

      expect(createSSRApp).toHaveBeenCalledWith({ name: 'TestComponent' }, {})
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
