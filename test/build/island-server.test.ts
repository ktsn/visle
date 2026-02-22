import { describe, test, expect } from 'vitest'

import { serve, serveAndRenderMain } from './build-utils.ts'

describe('Island plugin on server', () => {
  test('compiles vue component', async () => {
    const code = await serveAndRenderMain({
      'main.vue': `
        <script setup>
          import Counter from "./counter.vue";
        </script>
        <template>
					<div>
						<h1>Counter</h1>
	          <Counter v-client:load />
					</div>
        </template>
      `,
      'counter.vue': `
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
      '<script type="module" src="/@visle/entry" async></script><div><h1>Counter</h1><vue-island entry="/counter.vue"><!--[--><button>0</button><!--]--></vue-island></div>',
    )
  })

  test('pass props to island', async () => {
    const code = await serveAndRenderMain({
      'main.vue': `
        <script setup>
        import Child from './child.vue'
        </script>
        <template>
          <Child v-client:load foo="bar" :baz="123" :qux="true" />
        </template>
      `,
      'child.vue': `
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
      '<script type="module" src="/@visle/entry" async></script><vue-island entry="/child.vue" serialized-props="{&quot;foo&quot;:&quot;bar&quot;,&quot;baz&quot;:123,&quot;qux&quot;:true}"><!--[--><div>bar 123 true</div><!--]--></vue-island>',
    )
  })

  test('inject css of component', async () => {
    const code = await serveAndRenderMain({
      'main.vue': `
        <script setup>
        import Child from './child.vue'
        </script>
        <template>
          <Child v-client:load />
        </template>
        <style>
        h1 { color: red; }
        </style>
      `,
      'child.vue': `
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
      `<link rel="stylesheet" href="/main.vue?vue&type=style&index=0&lang.css"><link rel="stylesheet" href="/child.vue?vue&type=style&index=0&lang.css"><link rel="stylesheet" href="/child.vue?vue&type=style&index=1&scoped=52e56919&lang.css"><script type="module" src="/@visle/entry" async></script><vue-island entry="/child.vue"><!--[--><button data-v-52e56919>hello</button><!--]--></vue-island>`,
    )
  })

  test('render client entry file', async () => {
    const server = await serve()
    const result = await server.transformRequest('/@visle/entry')

    expect(result).not.toBe(null)
  })
})
