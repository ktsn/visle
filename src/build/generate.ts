import path from 'node:path'

import { normalizePath } from 'vite'

import { pathToExportName } from './paths.js'

export const clientVirtualEntryId = '\0@visle/client-entry'

export const serverVirtualEntryId = '\0@visle/server-entry'

export const symbolImportId = '\0@visle/symbols'

export const symbolCode = `export const islandSymbol = Symbol('@visle/island')`

export const islandElementName = 'vue-island'

export function generateClientVirtualEntryCode(componentIds: string[]): string {
  return (
    componentIds
      // Export each component to avoid being tree-shaken
      .map((id, i) => `export { default as _${i} } from '${id}'`)
      .join('\n')
  )
}

export function generateServerVirtualEntryCode(entryDir: string, componentIds: string[]): string {
  return componentIds
    .map((id) => {
      const exportName = pathToExportName(path.relative(entryDir, id))
      return `export { default as ${exportName} } from '${id}'`
    })
    .join('\n')
}

export const serverWrapPrefix = '\0visle:server-wrap:'

/**
 * Source-importable prefix for island wrapper virtual modules.
 * Used in generated source code (e.g., by the server-transform plugin).
 * resolveId maps this to the virtual module prefix (islandWrapPrefix).
 */
export const islandWrapId = 'visle:island-wrap:'

export const islandWrapPrefix = '\0' + islandWrapId

export function generateServerComponentCodeJS(
  filePath: string,
  componentRelativePath: string,
): string {
  const normalizedFilePath = normalizePath(filePath)
  const normalizedRelativePath = normalizePath(componentRelativePath)

  return `import { defineComponent, h, useSSRContext } from 'vue'
import OriginalComponent from '${normalizedFilePath}'

export default defineComponent({
  setup(_props, { slots }) {
    const context = useSSRContext()
    const manifest = context.manifest

    const cssIds = manifest.getDependingClientCssIds('${normalizedRelativePath}')

    context.loadCss ??= new Set()
    for (const cssId of cssIds) {
      context.loadCss.add(cssId)
    }

    return () => h(OriginalComponent, null, slots)
  },
})
`
}

export function generateIslandWrapperCodeJS(
  filePath: string,
  componentRelativePath: string,
  customElementEntryRelativePath: string,
): string {
  const normalizedFilePath = normalizePath(filePath)
  const normalizedRelativePath = normalizePath(componentRelativePath)
  const normalizedEntryRelativePath = normalizePath(customElementEntryRelativePath)

  return `import { defineComponent, h, useSSRContext, useAttrs, inject, provide } from 'vue'
import { islandSymbol } from '${symbolImportId}'
import OriginalComponent from '${normalizedFilePath}'

export default defineComponent({
  inheritAttrs: false,
  setup(_props, { slots }) {
    const inIsland = inject(islandSymbol, false)
    provide(islandSymbol, true)

    const context = useSSRContext()
    const attrs = useAttrs()
    const manifest = context.manifest

    const clientImportId = manifest.getClientImportId('${normalizedRelativePath}')
    const entryImportId = manifest.getClientImportId('${normalizedEntryRelativePath}')
    const cssIds = manifest.getDependingClientCssIds('${normalizedRelativePath}')

    context.loadJs ??= new Set()
    context.loadJs.add(entryImportId)

    context.loadCss ??= new Set()
    for (const cssId of cssIds) {
      context.loadCss.add(cssId)
    }

    if (inIsland) {
      return () => h(OriginalComponent, attrs, slots)
    }

    const isEmptyProps = Object.keys(attrs).length === 0

    return () => h('${islandElementName}', {
      entry: clientImportId,
      'serialized-props': isEmptyProps ? undefined : JSON.stringify(attrs),
    }, [h(OriginalComponent, attrs, slots)])
  },
})
`
}
