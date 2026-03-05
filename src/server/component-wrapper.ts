import type { Component } from 'vue'
import { defineComponent, h, useSSRContext, useAttrs, inject, provide, onServerPrefetch } from 'vue'

import type { RenderContext } from './render.js'
import { islandSymbol } from './symbol.js'

function addCssIdsToContext(context: RenderContext, cssIds: string[]) {
  context.loadCss ??= new Set()
  for (const cssId of cssIds) {
    context.loadCss.add(cssId)
  }
}

export function createComponentWrapper(
  normalizedRelativePath: string,
  normalizedEntryRelativePath: string,
  OriginalComponent: Component,
) {
  return defineComponent({
    inheritAttrs: false,

    props: {
      __visle_client__: Boolean,
    },

    setup(props, { slots }) {
      const attrs = useAttrs()
      const context: RenderContext = useSSRContext()!
      const manifest = context.manifest!

      const isIsland = props.__visle_client__

      if (isIsland) {
        const inIsland = inject(islandSymbol, false)
        provide(islandSymbol, true)

        let clientImportId = ''

        onServerPrefetch(async () => {
          const [resolvedClientImportId, entryImportId, cssIds] = await Promise.all([
            manifest.getClientImportId(normalizedRelativePath),
            manifest.getClientImportId(normalizedEntryRelativePath),
            manifest.getDependingClientCssIds(normalizedRelativePath),
          ])

          clientImportId = resolvedClientImportId

          context.loadJs ??= new Set()
          context.loadJs.add(entryImportId)

          addCssIdsToContext(context, cssIds)
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
            },
            [h(OriginalComponent, attrs, slots)],
          )
        }
      }

      // Server-only path: just load CSS and render original component
      onServerPrefetch(async () => {
        const cssIds = await manifest.getDependingClientCssIds(normalizedRelativePath)

        addCssIdsToContext(context, cssIds)
      })

      return () => h(OriginalComponent, attrs, slots)
    },
  })
}
