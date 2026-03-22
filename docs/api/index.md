# API Reference

## `visle` Module

### `createRender(options?)`

Creates a render function that renders Vue components to HTML strings.

```ts
import { createRender } from 'visle'

const render = createRender()
const html = await render('index', { title: 'Hello' })
```

**Options:**

```ts
interface RenderOptions {
  /**
   * Directory path for server build output.
   * Pass the same value as the Visle plugin's `serverOutDir`.
   * Default: 'dist/server'
   */
  serverOutDir?: string
}
```

**Return type: `RenderFunction<T>`**

```ts
interface RenderFunction<T> {
  // Render a component to an HTML string
  <K extends keyof T>(componentPath: K, ...args: RenderArgs<T[K]>): Promise<string>

  // Set a custom loader (used in development)
  setLoader(loader: RenderLoader): void
}
```

### `VisleEntries`

An interface for declaring available entry components and their prop types. Populated by the generated `src/visle-generated.d.ts` via module augmentation.

```ts
import { createRender, type VisleEntries } from 'visle'

const render = createRender<VisleEntries>()
```

See the [TypeScript guide](../guide/typescript) for details.

## `visle/dev` Module

### `createDevLoader(viteConfig?)`

Creates a development loader that integrates with Vite's dev server for HMR.

```ts
import { createDevLoader } from 'visle/dev'

const loader = createDevLoader()
```

**Parameters:**

- `viteConfig` (optional) — Vite `InlineConfig` object for customizing the dev server

**Return type: `DevRenderLoader`**

```ts
interface DevRenderLoader extends RenderLoader {
  /** Connect-compatible middleware for serving Vite dev assets */
  middleware: Connect.Server

  /** Shut down the Vite dev server */
  close(): Promise<void>
}
```

**Usage:**

```ts
const loader = createDevLoader()
render.setLoader(loader)

// Use loader.middleware in your server
app.use(loader.middleware)

// Clean up when done
await loader.close()
```

See the [Development guide](../guide/development) for full examples.

## `visle/build` Module

### `visle(config?)`

Vite plugin that configures Visle's build environments for server rendering and island hydration.

```ts
import { visle } from 'visle/build'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [visle()],
})
```

**Config:**

```ts
interface VisleConfig {
  /**
   * Directory containing page entry components.
   * Default: 'src/pages'
   */
  entryDir?: string

  /**
   * Output directory for server build.
   * Default: 'dist/server'
   */
  serverOutDir?: string

  /**
   * Output directory for client build (CSS, island JS).
   * Default: 'dist/client'
   */
  clientOutDir?: string

  /**
   * Path for generated type definition file.
   * Set to `null` to disable.
   * Default: 'src/visle-generated.d.ts'
   */
  dts?: string | null

  /**
   * @vitejs/plugin-vue options
   */
  vue?: ViteVuePluginOptions
}
```

## Directives

### `v-client:load`

Hydrates an island component immediately when the page loads.

```vue
<MyComponent v-client:load />
```

### `v-client:visible`

Hydrates an island component when it enters the viewport.

```vue
<MyComponent v-client:visible />
```

**Options:**

- `rootMargin` — Margin around the viewport for triggering hydration early

```vue
<MyComponent v-client:visible="{ rootMargin: '200px' }" />
```

### `v-client:idle`

Hydrates an island component when the browser becomes idle.

```vue
<MyComponent v-client:idle />
```

**Options:**

- `timeout` — Maximum time to wait before forcing hydration (ms)

### `v-client:media`

Hydrates an island component when the specified media query matches.

```vue
<MyComponent v-client:media="'(max-width: 768px)'" />
```
