import { describe, test, expect } from 'vitest'
import { parse } from 'vue/compiler-sfc'

import { buildImportMap, findVClientElements } from './sfc-analysis.ts'

function parseSfc(code: string) {
  return parse(code).descriptor
}

describe('buildImportMap', () => {
  describe('script setup', () => {
    test('extracts .vue imports', () => {
      const descriptor = parseSfc(`
        <script setup>
        import Counter from './Counter.vue'
        </script>
        <template><div /></template>
      `)
      const map = buildImportMap(descriptor, 'test.vue')
      expect(map.get('Counter')).toEqual({ source: './Counter.vue' })
    })

    test('extracts multiple .vue imports', () => {
      const descriptor = parseSfc(`
        <script setup>
        import Counter from './Counter.vue'
        import Header from '../components/Header.vue'
        </script>
        <template><div /></template>
      `)
      const map = buildImportMap(descriptor, 'test.vue')
      expect(map.size).toBe(2)
      expect(map.get('Counter')).toEqual({ source: './Counter.vue' })
      expect(map.get('Header')).toEqual({ source: '../components/Header.vue' })
    })

    test('ignores non-.vue imports', () => {
      const descriptor = parseSfc(`
        <script setup>
        import { ref } from 'vue'
        import utils from './utils.ts'
        import Counter from './Counter.vue'
        </script>
        <template><div /></template>
      `)
      const map = buildImportMap(descriptor, 'test.vue')
      expect(map.size).toBe(1)
      expect(map.get('Counter')).toEqual({ source: './Counter.vue' })
    })

    test('returns empty map when no .vue imports', () => {
      const descriptor = parseSfc(`
        <script setup>
        import { ref } from 'vue'
        </script>
        <template><div /></template>
      `)
      const map = buildImportMap(descriptor, 'test.vue')
      expect(map.size).toBe(0)
    })
  })

  describe('script (options API)', () => {
    test('extracts imports with components option', () => {
      const descriptor = parseSfc(`
        <script>
        import Counter from './Counter.vue'
        export default {
          components: {
            Counter,
          },
        }
        </script>
        <template><div /></template>
      `)
      const map = buildImportMap(descriptor, 'test.vue')
      expect(map.get('Counter')).toEqual({ source: './Counter.vue' })
    })

    test('supports renamed components', () => {
      const descriptor = parseSfc(`
        <script>
        import OptionsCounter from './OptionsCounter.vue'
        export default {
          components: {
            RenamedCounter: OptionsCounter,
          },
        }
        </script>
        <template><div /></template>
      `)
      const map = buildImportMap(descriptor, 'test.vue')
      expect(map.size).toBe(1)
      expect(map.get('RenamedCounter')).toEqual({ source: './OptionsCounter.vue' })
      expect(map.has('OptionsCounter')).toBe(false)
    })

    test('supports string-literal keys in components', () => {
      const descriptor = parseSfc(`
        <script>
        import Counter from './Counter.vue'
        export default {
          components: {
            'my-counter': Counter,
          },
        }
        </script>
        <template><div /></template>
      `)
      const map = buildImportMap(descriptor, 'test.vue')
      expect(map.get('my-counter')).toEqual({ source: './Counter.vue' })
    })

    test('supports string-literal "components" key', () => {
      const descriptor = parseSfc(`
        <script>
        import Counter from './Counter.vue'
        export default {
          'components': {
            Counter,
          },
        }
        </script>
        <template><div /></template>
      `)
      const map = buildImportMap(descriptor, 'test.vue')
      expect(map.get('Counter')).toEqual({ source: './Counter.vue' })
    })

    test('falls back to import names without components option', () => {
      const descriptor = parseSfc(`
        <script>
        import Counter from './Counter.vue'
        export default {
          name: 'MyPage',
        }
        </script>
        <template><div /></template>
      `)
      const map = buildImportMap(descriptor, 'test.vue')
      expect(map.get('Counter')).toEqual({ source: './Counter.vue' })
    })

    test('falls back to import names without export default', () => {
      const descriptor = parseSfc(`
        <script>
        import Counter from './Counter.vue'
        </script>
        <template><div /></template>
      `)
      const map = buildImportMap(descriptor, 'test.vue')
      expect(map.get('Counter')).toEqual({ source: './Counter.vue' })
    })

    test('supports export default fn({ ... }) pattern', () => {
      const descriptor = parseSfc(`
        <script>
        import Counter from './Counter.vue'
        import { defineComponent } from 'vue'
        export default defineComponent({
          components: {
            Counter,
          },
        })
        </script>
        <template><div /></template>
      `)
      const map = buildImportMap(descriptor, 'test.vue')
      expect(map.get('Counter')).toEqual({ source: './Counter.vue' })
    })

    test('supports TypeScript lang', () => {
      const descriptor = parseSfc(`
        <script lang="ts">
        import Counter from './Counter.vue'
        export default {
          components: {
            Counter,
          },
        }
        </script>
        <template><div /></template>
      `)
      const map = buildImportMap(descriptor, 'test.vue')
      expect(map.get('Counter')).toEqual({ source: './Counter.vue' })
    })

    test('supports JSX lang', () => {
      const descriptor = parseSfc(`
        <script lang="jsx">
        import Counter from './Counter.vue'
        export default {
          components: {
            Counter,
          },
        }
        </script>
        <template><div /></template>
      `)
      const map = buildImportMap(descriptor, 'test.vue')
      expect(map.get('Counter')).toEqual({ source: './Counter.vue' })
    })

    test('supports TSX lang', () => {
      const descriptor = parseSfc(`
        <script lang="tsx">
        import Counter from './Counter.vue'
        export default {
          components: {
            Counter,
          },
        }
        </script>
        <template><div /></template>
      `)
      const map = buildImportMap(descriptor, 'test.vue')
      expect(map.get('Counter')).toEqual({ source: './Counter.vue' })
    })

    test('ignores named imports (non-default)', () => {
      const descriptor = parseSfc(`
        <script>
        import { Counter } from './Counter.vue'
        export default {}
        </script>
        <template><div /></template>
      `)
      const map = buildImportMap(descriptor, 'test.vue')
      expect(map.size).toBe(0)
    })

    test('handles multiple imports with components mapping', () => {
      const descriptor = parseSfc(`
        <script>
        import Counter from './Counter.vue'
        import Header from './Header.vue'
        export default {
          components: {
            Counter,
            MyHeader: Header,
          },
        }
        </script>
        <template><div /></template>
      `)
      const map = buildImportMap(descriptor, 'test.vue')
      expect(map.size).toBe(2)
      expect(map.get('Counter')).toEqual({ source: './Counter.vue' })
      expect(map.get('MyHeader')).toEqual({ source: './Header.vue' })
    })

    test('ignores components entry referencing unknown import', () => {
      const descriptor = parseSfc(`
        <script>
        import Counter from './Counter.vue'
        export default {
          components: {
            Counter,
            Unknown: SomeOtherComponent,
          },
        }
        </script>
        <template><div /></template>
      `)
      const map = buildImportMap(descriptor, 'test.vue')
      expect(map.size).toBe(1)
      expect(map.get('Counter')).toEqual({ source: './Counter.vue' })
    })
  })

  describe('no script', () => {
    test('returns empty map for template-only SFC', () => {
      const descriptor = parseSfc(`
        <template><div /></template>
      `)
      const map = buildImportMap(descriptor, 'test.vue')
      expect(map.size).toBe(0)
    })
  })
})

describe('findVClientElements', () => {
  function parseTemplate(template: string) {
    const descriptor = parseSfc(`<template>${template}</template>`)
    return descriptor.template!.ast!.children
  }

  test('finds element with v-client:load', () => {
    const children = parseTemplate('<Counter v-client:load />')
    const results = findVClientElements(children)
    expect(results).toHaveLength(1)
    expect(results[0].tag).toBe('Counter')
  })

  test('finds multiple elements with v-client:load', () => {
    const children = parseTemplate(`
      <Counter v-client:load />
      <Header v-client:load />
    `)
    const results = findVClientElements(children)
    expect(results).toHaveLength(2)
    expect(results.map((r) => r.tag)).toEqual(['Counter', 'Header'])
  })

  test('ignores elements without v-client:load', () => {
    const children = parseTemplate(`
      <Counter />
      <Header v-client:load />
      <Footer />
    `)
    const results = findVClientElements(children)
    expect(results).toHaveLength(1)
    expect(results[0].tag).toBe('Header')
  })

  test('finds nested elements with v-client:load', () => {
    const children = parseTemplate(`
      <div>
        <section>
          <Counter v-client:load />
        </section>
      </div>
    `)
    const results = findVClientElements(children)
    expect(results).toHaveLength(1)
    expect(results[0].tag).toBe('Counter')
  })

  test('finds deeply nested and top-level elements', () => {
    const children = parseTemplate(`
      <Header v-client:load />
      <div>
        <Counter v-client:load />
      </div>
    `)
    const results = findVClientElements(children)
    expect(results).toHaveLength(2)
    expect(results.map((r) => r.tag)).toEqual(['Header', 'Counter'])
  })

  test('returns empty array when no v-client:load elements', () => {
    const children = parseTemplate(`
      <div>
        <Counter />
        <Header />
      </div>
    `)
    const results = findVClientElements(children)
    expect(results).toHaveLength(0)
  })

  test('returns empty array for empty template', () => {
    const children = parseTemplate('')
    const results = findVClientElements(children)
    expect(results).toHaveLength(0)
  })

  test('ignores directives with different names', () => {
    const children = parseTemplate(`
      <Counter v-if="true" />
      <Header v-client:load />
    `)
    const results = findVClientElements(children)
    expect(results).toHaveLength(1)
    expect(results[0].tag).toBe('Header')
  })

  test('finds v-client:load on native HTML elements', () => {
    const children = parseTemplate('<div v-client:load />')
    const results = findVClientElements(children)
    expect(results).toHaveLength(1)
    expect(results[0].tag).toBe('div')
  })
})
