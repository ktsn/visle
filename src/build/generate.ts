import path from 'node:path'
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

export function generateIslandCode(
  fileName: string,
  clientImportId: string,
  entryImportId: string,
  cssIds: string[],
): string {
  return `<script setup>
  import { useSSRContext, useAttrs, provide, inject } from 'vue'
  import { islandSymbol } from '${symbolImportId}'
  import OriginalComponent from '${fileName}?original'

  defineOptions({
    inheritAttrs: false,
  })

  const inIsland = inject(islandSymbol, false)
  provide(islandSymbol, true)

  const context = useSSRContext()
  const attrs = useAttrs()

  context.loadJs ??= new Set()
  context.loadJs.add('${entryImportId}')

  context.loadCss ??= new Set()
  ${cssIds.map((cssId) => `context.loadCss.add('${cssId}')`).join('\n')}

  const isEmptyProps = Object.keys(attrs).length === 0
  </script>

  <template>
    <OriginalComponent v-if="inIsland" v-bind="attrs" />
    <${islandElementName} v-else entry="${clientImportId}" :serialized-props="isEmptyProps ? undefined : JSON.stringify(attrs)">
      <OriginalComponent v-bind="attrs" />
    </${islandElementName}>
  </template>`
}

export function generateServerComponentCode(
  fileName: string,
  cssIds: string[],
): string {
  return `<script setup>
  import { useSSRContext } from 'vue'
  import OriginalComponent from '${fileName}?original'

  const context = useSSRContext()

  context.loadCss ??= new Set()
  ${cssIds.map((cssId) => `context.loadCss.add('${cssId}')`).join('\n')}
  </script>

  <template>
    <OriginalComponent>
      <template v-for="(_, slot) of $slots" v-slot:[slot]="scope"><slot :name="slot" v-bind="scope"/></template>
    </OriginalComponent>
  </template>`
}
