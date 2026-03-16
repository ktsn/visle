import { IslandStrategy } from '../custom-element.js'
import { load } from './load.js'
import { visible } from './visble.js'

export const strategies: Record<string, IslandStrategy> = {
  load,
  visible,
}
