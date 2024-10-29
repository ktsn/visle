export const islandSymbolImportId = '@vue-islands-renderer/symbol'

export const islandSymbolCode = "export default Symbol('@vue-islands-renderer')"

export function generateIslandCode(
  fileName: string,
  clientImportId: string,
  entryImportId: string,
  cssIds: string[],
): string {
  return `<script setup>
  import { useSSRContext, useAttrs, provide, inject } from 'vue'
  import islandSymbol from '${islandSymbolImportId}'
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
    <OriginalComponent v-if="inIsland" v-bind="$attrs" />
    <vue-island v-else entry="${clientImportId}" :serialized-props="isEmptyProps ? undefined : JSON.stringify(attrs)">
      <OriginalComponent v-bind="$attrs" />
    </vue-island>
  </template>`
}
