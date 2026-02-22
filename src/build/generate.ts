import path from 'node:path'

import { pathToExportName } from './paths.js'

export const clientVirtualEntryId = '\0@visle/client-entry'

export const serverVirtualEntryId = '\0@visle/server-entry'

export const islandElementName = 'vue-island'

export function generateClientVirtualEntryCode(componentIds: string[]): string {
  return (
    componentIds
      // Export each component to avoid being tree-shaken
      .map((id, i) => `export { default as _${i} } from '${id}'`)
      .join('\n')
  )
}

export function generateServerVirtualEntryCode(
  componentDir: string,
  componentIds: string[],
): string {
  return componentIds
    .map((id) => {
      const exportName = pathToExportName(path.relative(componentDir, id))
      return `export { default as ${exportName} } from '${id}'`
    })
    .join('\n')
}

export const serverWrapPrefix = '\0visle:server-wrap:'

/**
 * Source-importable prefix for island wrapper virtual modules.
 * Used in generated source code (e.g., by the v-client plugin).
 * resolveId maps this to the virtual module prefix (islandWrapPrefix).
 */
export const islandWrapId = 'visle:island-wrap:'

export const islandWrapPrefix = '\0' + islandWrapId

export function generateServerComponentCodeJS(
  filePath: string,
  componentRelativePath: string,
): string {
  return `import { defineComponent, h, useSSRContext } from 'vue'
import OriginalComponent from '${filePath}'

export default defineComponent({
  setup(_props, { slots }) {
    const context = useSSRContext()
    const manifest = context.manifest

    const cssIds = manifest.getDependingClientCssIds('${componentRelativePath}')

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
  return `import { defineComponent, h, useSSRContext, useAttrs } from 'vue'
import OriginalComponent from '${filePath}'

export default defineComponent({
  inheritAttrs: false,
  setup(_props, { slots }) {
    const context = useSSRContext()
    const attrs = useAttrs()
    const manifest = context.manifest

    const clientImportId = manifest.getClientImportId('${componentRelativePath}')
    const entryImportId = manifest.getClientImportId('${customElementEntryRelativePath}')
    const cssIds = manifest.getDependingClientCssIds('${componentRelativePath}')

    context.loadJs ??= new Set()
    context.loadJs.add(entryImportId)

    context.loadCss ??= new Set()
    for (const cssId of cssIds) {
      context.loadCss.add(cssId)
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
