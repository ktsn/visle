import { Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import { islandCorePlugin } from './core.js'
import { generateComponentId } from '../component-id.js'
import { devStyleSSRPlugin } from './dev-ssr-css.js'
import { islandElementName } from '../generate.js'
import { ResolvedVisleConfig } from '../config.js'

export function islandPlugin(config: ResolvedVisleConfig): Plugin[] {
  return [
    islandCorePlugin(config),
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
