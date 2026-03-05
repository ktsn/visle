import type { Component } from 'vue'
import { defineComponent, h, useSSRContext, useAttrs, inject, provide, onServerPrefetch } from 'vue'

import type { RenderContext } from './render.js'
import { islandSymbol } from './symbol.js'

export function createComponentWrapper(
  normalizedRelativePath: string,
  normalizedEntryRelativePath: string,
  OriginalComponent: Component,
) {
  return defineComponent({
    inheritAttrs: false,

    props: {
      visleClient: Boolean,
    },

    setup(props, { slots }) {
      const attrs = useAttrs()
      const context: RenderContext = useSSRContext()!
      const manifest = context.manifest!

      const isIsland = props.visleClient

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

          context.loadCss ??= new Set()
          for (const cssId of cssIds) {
            context.loadCss.add(cssId)
          }
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

        context.loadCss ??= new Set()
        for (const cssId of cssIds) {
          context.loadCss.add(cssId)
        }
      })

      return () => h(OriginalComponent, attrs, slots)
    },
  })
}
