import type { Component } from 'vue'
import { defineComponent, h, useSSRContext, useAttrs, inject, provide, onServerPrefetch } from 'vue'

import type { RenderContext } from './render.js'
import { islandSymbol } from './symbol.js'

export function createComponentWrapper(
  normalizedRelativePath: string,
  importedName: string,
  OriginalComponent: Component,
) {
  return defineComponent({
    inheritAttrs: false,

    props: {
      __visle_strategy__: String,
      __visle_options__: Object,
    },

    setup(props, { slots }) {
      const attrs = useAttrs()

      if (props.__visle_strategy__) {
        const context: RenderContext = useSSRContext()!
        const manifest = context.manifest!

        const inIsland = inject(islandSymbol, false)
        provide(islandSymbol, true)

        let clientImportId = ''

        onServerPrefetch(async () => {
          clientImportId = await manifest.getClientImportId(normalizedRelativePath)
          context.hasIsland = true
        })

        if (inIsland) {
          return () => h(OriginalComponent, attrs, slots)
        }

        return () => {
          const isEmptyProps = Object.keys(attrs).length === 0
          const strategy = props.__visle_strategy__
          const options = props.__visle_options__

          return h(
            'vue-island',
            {
              entry: clientImportId,
              'serialized-props': isEmptyProps ? undefined : JSON.stringify(attrs),
              'imported-name': importedName === 'default' ? undefined : importedName,
              strategy: strategy === 'load' ? undefined : strategy,
              options: options ? JSON.stringify(options) : undefined,
            },
            [h(OriginalComponent, attrs, slots)],
          )
        }
      }

      // Server-only path: just render original component
      return () => h(OriginalComponent, attrs, slots)
    },
  })
}
