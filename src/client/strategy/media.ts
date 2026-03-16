import { IslandStrategy } from '../custom-element.js'

export const media: IslandStrategy = {
  schedule: (wrapper, onReady) => {
    const query = getMediaQuery(wrapper)

    if (!query) {
      onReady()
      return undefined
    }

    const mql = window.matchMedia(query)

    if (mql.matches) {
      onReady()
      return undefined
    }

    const handler = (event: MediaQueryListEvent) => {
      if (event.matches) {
        mql.removeEventListener('change', handler)
        onReady()
      }
    }

    mql.addEventListener('change', handler)

    return () => {
      mql.removeEventListener('change', handler)
    }
  },
}

function getMediaQuery(wrapper: HTMLElement): string | undefined {
  const options = wrapper.getAttribute('options')
  if (!options) {
    return undefined
  }
  const parsed = JSON.parse(options)
  return typeof parsed === 'string' ? parsed : undefined
}
