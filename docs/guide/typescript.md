# TypeScript

Visle generates type definitions to provide type-safe rendering with auto-completion for component names and props.

## Generated Type Definitions

When you run `vite build` (or `vite dev`), Visle generates a `src/visle-generated.d.ts` file in your project. This file declares the available entry components and their prop types.

Example generated file:

```ts
// src/visle-generated.d.ts
import 'visle'

declare module 'visle' {
  interface VisleEntries {
    index: { products: Product[] }
    detail: { product: Product }
  }
}
```

## Including in `tsconfig.json`

Make sure the generated file is included in your TypeScript configuration's `include` or `files` (in most cases, it is already covered by `src/**/*.ts` pattern):

```json
{
  "include": ["src/**/*.ts", "src/**/*.vue"]
}
```

## Type-Safe Render Calls

Import `VisleEntries` and pass it as a type parameter to `createRender()`:

```ts
import { createRender, type VisleEntries } from 'visle'

const render = createRender<VisleEntries>()
```

Now render calls are fully type-checked:

```ts
// Type-checked: component name and props
await render('index', { products: [] })

// Type error: unknown component
await render('nonexistent')

// Type error: wrong props
await render('index', { wrong: true })
```

## Customizing the Output Path

By default, the type definition file is written to `src/visle-generated.d.ts`. You can change this with the `dts` option:

```ts
import { visle } from 'visle/build'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    visle({
      dts: 'src/types/visle.d.ts',
    }),
  ],
})
```

To disable type generation entirely, set `dts` to `null`:

```ts
visle({
  dts: null,
})
```
