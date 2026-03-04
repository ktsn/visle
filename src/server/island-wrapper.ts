import type { Component } from 'vue'
import { defineComponent, h, useSSRContext, useAttrs, inject, provide, onServerPrefetch } from 'vue'

import type { RenderContext } from './render.js'
import { islandSymbol } from './symbol.js'

const islandElementName = 'vue-island'

export function createIslandWrapper(
  normalizedRelativePath: string,
  normalizedEntryRelativePath: string,
  OriginalComponent: Component,
) {
  return defineComponent({
    inheritAttrs: false,
    setup(_props, { slots }) {
      const inIsland = inject(islandSymbol, false)
      provide(islandSymbol, true)

      const context: RenderContext = useSSRContext()!
      const attrs = useAttrs()
      const manifest = context.manifest!

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

      const isEmptyProps = Object.keys(attrs).length === 0

      return () =>
        h(
          islandElementName,
          {
            entry: clientImportId,
            'serialized-props': isEmptyProps ? undefined : JSON.stringify(attrs),
          },
          [h(OriginalComponent, attrs, slots)],
        )
    },
  })
}
