import path from 'node:path'

export const clientVirtualEntryId = '\0@vue-islands-renderer/client-entry'

export const serverVirtualEntryId = '\0@vue-islands-renderer/server-entry'

export const symbolImportId = '\0@vue-islands-renderer/symbols'

export const symbolCode = `export const islandSymbol = Symbol('@vue-islands-renderer/island')`

export const islandElementName = 'vue-island'

export function generateClientVirtualEntryCode(componentIds: string[]): string {
  return componentIds.map((id) => `import '${id}'`).join('\n')
}

export function generateServerVirtualEntryCode(
  config: {
    root: string
    componentDir: string
  },
  componentIds: string[],
): string {
  const basePath = path.join(config.root, config.componentDir)

  return componentIds
    .map((id) => {
      const exportId = pathToExportId(path.relative(basePath, id))
      return `export { default as ${exportId} } from '${id}'`
    })
    .join('\n')
}

export function pathToExportId(targetPath: string): string {
  const stripped = targetPath.replace(/^\//, '').replace(/\.vue$/, '')
  const replaced = stripped
    .replaceAll('$', '$$')
    .replaceAll('.', '$')
    .replaceAll('_', '__')
    .replaceAll('/', '_')

  return `_${replaced}`
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
