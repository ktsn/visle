import { IslandStrategy } from '../custom-element.js'

export const load: IslandStrategy = {
  schedule: (_wrapper, onReady) => {
    onReady()
    return undefined
  },
}
