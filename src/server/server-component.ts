import type { Component } from 'vue'
import { defineComponent, h, useSSRContext, onServerPrefetch } from 'vue'

import type { RenderContext } from './render.js'

export function createServerComponent(
  normalizedRelativePath: string,
  OriginalComponent: Component,
) {
  return defineComponent({
    setup(_props, { slots }) {
      const context: RenderContext = useSSRContext()!
      const manifest = context.manifest!

      onServerPrefetch(async () => {
        const cssIds = await manifest.getDependingClientCssIds(normalizedRelativePath)

        context.loadCss ??= new Set()
        for (const cssId of cssIds) {
          context.loadCss.add(cssId)
        }
      })

      return () => h(OriginalComponent, null, slots)
    },
  })
}
