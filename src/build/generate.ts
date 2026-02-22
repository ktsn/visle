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

export function generateIslandWrapperCode(
  componentRelativePath: string,
  customElementEntryRelativePath: string,
): string {
  return `<script setup>
  import { useSSRContext, useAttrs } from 'vue'

  defineOptions({
    inheritAttrs: false,
  })

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
  </script>

  <template>
    <${islandElementName} :entry="clientImportId" :serialized-props="isEmptyProps ? undefined : JSON.stringify(attrs)">
      <slot />
    </${islandElementName}>
  </template>`
}

export function generateServerComponentCode(
  fileName: string,
  componentRelativePath: string,
): string {
  return `<script setup>
  import { useSSRContext } from 'vue'
  import OriginalComponent from '${fileName}?original'

  const context = useSSRContext()
  const manifest = context.manifest

  const cssIds = manifest.getDependingClientCssIds('${componentRelativePath}')

  context.loadCss ??= new Set()
  for (const cssId of cssIds) {
    context.loadCss.add(cssId)
  }
  </script>

  <template>
    <OriginalComponent>
      <template v-for="(_, slot) of $slots" v-slot:[slot]="scope"><slot :name="slot" v-bind="scope"/></template>
    </OriginalComponent>
  </template>`
}
