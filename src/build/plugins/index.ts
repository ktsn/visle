import { Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import { islandCorePlugin, IslandPluginOptions } from './core.js'
import { generateComponentId } from '../component-id.js'
import { devStyleSSRPlugin } from './dev-ssr-css.js'
import { islandElementName } from '../generate.js'

export function islandPlugin(options: IslandPluginOptions): Plugin[] {
  return [
    islandCorePlugin(options),
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
