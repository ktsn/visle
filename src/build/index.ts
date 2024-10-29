import { Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import { island, IslandPluginOptions } from './island.js'

const defaultOptions: IslandPluginOptions = {
  clientDist: 'dist-client',
  serverDist: 'dist-server',
}

export default function plugin(
  options: Partial<IslandPluginOptions> = {},
): Plugin[] {
  return [
    island({
      ...defaultOptions,
      ...options,
    }),
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag === 'vue-island',
        },
      },
    }),
  ]
}
