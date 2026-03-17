import { IslandStrategy } from '../custom-element.js'

export const idle: IslandStrategy = {
  schedule: (wrapper, onReady) => {
    if (typeof requestIdleCallback === 'function') {
      const timeout = getTimeout(wrapper)
      const id = requestIdleCallback(onReady, timeout !== undefined ? { timeout } : undefined)
      return () => {
        cancelIdleCallback(id)
      }
    }

    // Fallback for browsers without requestIdleCallback.
    // Wait for the load event, then defer with setTimeout.
    if (document.readyState === 'complete') {
      const id = setTimeout(onReady, 0)
      return () => {
        clearTimeout(id)
      }
    }

    const onLoad = () => {
      setTimeout(onReady, 0)
    }

    window.addEventListener('load', onLoad, { once: true })

    return () => {
      window.removeEventListener('load', onLoad)
    }
  },
}

function getTimeout(wrapper: HTMLElement): number | undefined {
  const options = JSON.parse(wrapper.getAttribute('options') ?? '{}')
  return typeof options?.timeout === 'number' ? options.timeout : undefined
}
