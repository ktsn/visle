import { IslandStrategy } from '../custom-element.js'

export const visible: IslandStrategy = {
  schedule: (wrapper, onReady) => {
    const rootMargin = getRootMargin(wrapper)

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          observer.disconnect()
          onReady()
        }
      },
      rootMargin ? { rootMargin } : undefined,
    )

    // The host element uses display:contents and has no layout box,
    // so observe the first light-DOM child which has actual dimensions.
    observer.observe(wrapper.firstElementChild ?? wrapper)

    return () => {
      observer.disconnect()
    }
  },
}

function getRootMargin(wrapper: HTMLElement): string | undefined {
  const options = JSON.parse(wrapper.getAttribute('options') ?? '{}')
  return typeof options?.rootMargin === 'string' ? options.rootMargin : undefined
}
