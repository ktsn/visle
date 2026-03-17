import { IslandStrategy } from '../custom-element.js'
import { idle } from './idle.js'
import { load } from './load.js'
import { media } from './media.js'
import { visible } from './visible.js'

export const strategies: Record<string, IslandStrategy> = {
  load,
  visible,
  idle,
  media,
}
