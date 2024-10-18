export function generateIslandCode(
  fileName: string,
  clientImportId: string,
  entryImportId: string,
  cssIds: string[],
): string {
  return `<script setup>
	import { useSSRContext, provide, inject } from 'vue'
	import OriginalComponent from '${fileName}?original'

	defineOptions({
		inheritAttrs: false,
	})

  const inIsland = inject('island', false)
  provide('island', true)

	const context = useSSRContext()
	context.loadJs ??= new Set()
	context.loadJs.add('${entryImportId}')

	context.loadCss ??= new Set()
	${cssIds.map((cssId) => `context.loadCss.add('${cssId}')`).join('\n')}
	</script>

	<template>
    <OriginalComponent v-if="inIsland" v-bind="$attrs" />
		<vue-island v-else entry="${clientImportId}" :serialized-props="JSON.stringify($attrs)">
			<OriginalComponent v-bind="$attrs" />
		</vue-island>
	</template>`
}
