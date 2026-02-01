import vue from '@vitejs/plugin-vue'
import { Plugin } from 'vite'

import { generateComponentId } from '../component-id.js'
import { ResolvedVisleConfig } from '../config.js'
import { islandElementName } from '../generate.js'
import { islandCorePlugin } from './core.js'
import { devStyleSSRPlugin } from './dev-ssr-css.js'

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
