import { Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import { island, IslandPluginOptions } from './island.js'
import { generateComponentId } from './component-id.js'
import { devStyleSSRPlugin } from './dev-ssr-css.js'
import { islandElementName } from './generate.js'

export default function plugin(options: IslandPluginOptions): Plugin[] {
  return [
    island(options),
    vue({
      features: {
        componentIdGenerator: (filePath, source, isProduction) => {
          return generateComponentId(filePath, source, isProduction ?? false)
        },
      },
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag === islandElementName,
        },
      },
    }),
    devStyleSSRPlugin(),
  ]
}
