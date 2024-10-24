import { describe, test, expect } from 'vitest'
import { serveAndRenderMain } from './build-utils.ts'

describe('Island plugin on server', () => {
  test('compiles vue component', async () => {
    const code = await serveAndRenderMain({
      './main.vue': `
        <script setup>
          import Counter from "./counter.client.vue";
        </script>
        <template>
					<div>
						<h1>Counter</h1>
	          <Counter />
					</div>
        </template>
      `,
      './counter.client.vue': `
        <script setup>
          import { ref } from "vue";
          const count = ref(0);
        </script>
        <template>
          <button @click="count++">{{ count }}</button>
        </template>
      `,
    })

    expect(code).toBe(
      '<script type="module" src="/@entry-custom-element" async></script><div><h1>Counter</h1><vue-island entry="/counter.client.vue"><button>0</button></vue-island></div>',
    )
  })

  test('pass props to island', async () => {
    const code = await serveAndRenderMain({
      './main.vue': `
        <script setup>
        import Child from './child.client.vue'
        </script>
        <template>
          <Child foo="bar" :baz="123" :qux="true" />
        </template>
      `,
      './child.client.vue': `
        <script setup lang="ts">
        defineProps<{
          foo: string
          baz: number
          qux: boolean
        }>()
        </script>
        <template>
          <div>{{ foo }} {{ baz }} {{ qux }}</div>
        </template>
      `,
    })

    expect(code).toBe(
      '<script type="module" src="/@entry-custom-element" async></script><vue-island entry="/child.client.vue" serialized-props="{&quot;foo&quot;:&quot;bar&quot;,&quot;baz&quot;:123,&quot;qux&quot;:true}"><div>bar 123 true</div></vue-island>',
    )
  })
})
