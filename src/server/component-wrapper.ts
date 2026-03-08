import type { Component } from 'vue'
import { defineComponent, h, useSSRContext, useAttrs, inject, provide, onServerPrefetch } from 'vue'

import type { RenderContext } from './render.js'
import { islandSymbol } from './symbol.js'

export function createComponentWrapper(
  normalizedRelativePath: string,
  normalizedEntryRelativePath: string,
  importedName: string,
  OriginalComponent: Component,
) {
  return defineComponent({
    inheritAttrs: false,

    props: {
      __visle_client__: Boolean,
    },

    setup(props, { slots }) {
      const attrs = useAttrs()

      const isIsland = props.__visle_client__

      if (isIsland) {
        const context: RenderContext = useSSRContext()!
        const manifest = context.manifest!

        const inIsland = inject(islandSymbol, false)
        provide(islandSymbol, true)

        let clientImportId = ''

        onServerPrefetch(async () => {
          const [resolvedClientImportId, entryImportId] = await Promise.all([
            manifest.getClientImportId(normalizedRelativePath),
            manifest.getClientImportId(normalizedEntryRelativePath),
          ])

          clientImportId = resolvedClientImportId

          context.loadJs ??= new Set()
          context.loadJs.add(entryImportId)
        })

        if (inIsland) {
          return () => h(OriginalComponent, attrs, slots)
        }

        return () => {
          const isEmptyProps = Object.keys(attrs).length === 0

          return h(
            'vue-island',
            {
              entry: clientImportId,
              'serialized-props': isEmptyProps ? undefined : JSON.stringify(attrs),
              'imported-name': importedName === 'default' ? undefined : importedName,
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
