# API Reference

## `visle` Module

### `createRender(options?)`

Creates a render function that renders Vue components to HTML strings.

```ts
import { createRender, createStaticLoader } from 'visle'
import runtime from './dist/server/visle-runtime.js'

const render = createRender({ loader: createStaticLoader(runtime) })
const html = await render('index', { title: 'Hello' })
```

**Options:**

```ts
interface RenderOptions {
  loader?: RenderLoader
}
```

**Return type: `RenderFunction<T>`**

```ts
interface RenderFunction<T> {
  // Render a component to an HTML string
  <K extends keyof T>(componentPath: K, ...args: RenderArgs<T[K]>): Promise<string>

  // Install or replace the environment-specific loader
  setLoader(loader: RenderLoader): void
}
```

When creating a renderer without a loader, its environment entry point must call `setLoader()` before handling a request. Rendering earlier throws:

```text
[visle] Render loader is not configured. Call render.setLoader(loader) before rendering.
```

### `createStaticLoader(runtime)`

Creates a platform-neutral production loader from the generated static runtime module.

```ts
import { createStaticLoader } from 'visle'
import runtime from './dist/server/visle-runtime.js'

render.setLoader(createStaticLoader(runtime))
```

The Vite build writes `visle-runtime.js` beside the server entry. It statically imports both the emitted server entry and `visle-manifest.json` so deployment bundlers can discover the complete runtime artifact graph.

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
   * File extensions used to detect entry components in `entryDir`.
   * Each extension must include the leading dot. To support non-`.vue`
   * sources (e.g. `.md`), add a Vite plugin that transforms them into
   * Vue SFC text at the `load` phase.
   * Default: ['.vue']
   */
  entryExt?: string[]

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
