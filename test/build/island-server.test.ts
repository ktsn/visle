import { describe, test, expect } from 'vitest'
import { serve, serveAndRenderMain } from './build-utils.ts'

describe('Island plugin on server', () => {
  test('compiles vue component', async () => {
    const code = await serveAndRenderMain({
      'main.vue': `
        <script setup>
          import Counter from "./counter.island.vue";
        </script>
        <template>
					<div>
						<h1>Counter</h1>
	          <Counter />
					</div>
        </template>
      `,
      'counter.island.vue': `
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
      '<script type="module" src="/@visle/entry" async></script><div><h1>Counter</h1><vue-island entry="/counter.island.vue"><button>0</button></vue-island></div>',
    )
  })

  test('pass props to island', async () => {
    const code = await serveAndRenderMain({
      'main.vue': `
        <script setup>
        import Child from './child.island.vue'
        </script>
        <template>
          <Child foo="bar" :baz="123" :qux="true" />
        </template>
      `,
      'child.island.vue': `
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
      '<script type="module" src="/@visle/entry" async></script><vue-island entry="/child.island.vue" serialized-props="{&quot;foo&quot;:&quot;bar&quot;,&quot;baz&quot;:123,&quot;qux&quot;:true}"><div>bar 123 true</div></vue-island>',
    )
  })

  test('inject css of component', async () => {
    const code = await serveAndRenderMain({
      'main.vue': `
        <script setup>
        import Child from './child.island.vue'
        </script>
        <template>
          <Child />
        </template>
        <style>
        h1 { color: red; }
        </style>
      `,
      'child.island.vue': `
        <style>
        button {
          color: red;
        }
        </style>
        <template>
          <button>hello</button>
        </template>
        <style scoped>
        button { font-size: 13px; }
        </style>
      `,
    })

    expect(code).toBe(
      `<link rel="stylesheet" href="/main.vue?vue&type=style&index=0&lang.css"><link rel="stylesheet" href="/child.island.vue?vue&type=style&index=0&lang.css"><link rel="stylesheet" href="/child.island.vue?vue&type=style&index=1&scoped=4b3910e4&lang.css"><script type="module" src="/@visle/entry" async></script><vue-island entry="/child.island.vue"><button data-v-4b3910e4>hello</button></vue-island>`,
    )
  })

  test('render client entry file', async () => {
    const server = await serve()
    const result = await server.transformRequest('/@visle/entry')

    expect(result).not.toBe(null)
  })
})
