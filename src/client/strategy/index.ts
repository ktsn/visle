import { IslandStrategy } from '../custom-element.js'
import { load } from './load.js'
import { visible } from './visible.js'

export const strategies: Record<string, IslandStrategy> = {
  load,
  visible,
}
