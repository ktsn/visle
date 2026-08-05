# API Reference

## `visle` Module

### `createRender(options?)`

Creates a render function that renders Vue components to HTML strings.

```ts
import { createBundleLoader, createRender } from 'visle'
import bundle from './dist/server/visle-bundle.js'

const render = createRender({ loader: createBundleLoader(bundle) })
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

### `createBundleLoader(source)`

Creates a platform-neutral loader from a generated entry bundle and manifest source.

```ts
import { createBundleLoader } from 'visle'
import bundle from './dist/server/visle-bundle.js'

render.setLoader(createBundleLoader(bundle))
```

The Vite build writes `visle-bundle.js` beside the server entry. It statically imports both the emitted server entry and `visle-manifest.json` so deployment bundlers can discover the complete bundle artifact graph.

### `VisleEntries`

An interface for declaring available entry components and their prop types. Populated by the generated `src/visle-generated.d.ts` via module augmentation.

```ts
import { createRender, type VisleEntries } from 'visle'

const render = createRender<VisleEntries>()
```

See the [TypeScript guide](../guide/typescript) for details.

## `visle/vite` Module

### `createViteLoader()`

Creates a loader for a server application built by Vite in [integrated mode](../guide/integrated-mode.md).

```ts
import { createViteLoader } from 'visle/vite'

render.setLoader(createViteLoader())
```

The loader dynamically imports page entries through the Vite `ssr` environment. The Visle
Vite plugin supplies its virtual entry map and asset manifest, including lazy development CSS
resolution and the final production asset paths. This module must be processed by
`visle({ serverBuild: 'integrated' })`. The `visle/vite` subpath itself resolves through the package
exports; the plugin only resolves the virtual data modules that it imports.

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
   * Output directory for the `ssr` environment.
   * Default: 'dist/server'
   */
  serverOutDir?: string

  /**
   * Build Visle's server components, or contribute the runtime to
   * the shared `ssr` environment configured by another Vite plugin.
   * Default: 'components'
   */
  serverBuild?: 'components' | 'integrated'

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
