import { Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import { island, IslandPluginOptions } from './island.js'

export default function plugin(options: IslandPluginOptions): Plugin[] {
  return [
    island(options),
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag === 'vue-island',
        },
      },
    }),
  ]
}
