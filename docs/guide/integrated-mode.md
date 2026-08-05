# Integrated Mode

Integrated mode lets a Vite runtime provider build the application server and Visle pages together.
Use it when a platform plugin owns the server entry, development runtime, and deployment output.

| Mode                   | Server build owner                 | Loader                 |
| ---------------------- | ---------------------------------- | ---------------------- |
| `components` (default) | Your separate application build    | `createBundleLoader()` |
| `integrated`           | Vite and a runtime provider plugin | `createViteLoader()`   |

For a conventional Node.js server built separately from Visle, use the default mode described in
the [production guide](./production.md).

## Configure the Shared Server Environment

Enable integrated mode and configure the runtime provider to use Vite's `ssr` environment. For
example, this is the shared environment configuration used by Cloudflare Workers:

```ts
// vite.config.ts
import { cloudflare } from '@cloudflare/vite-plugin'
import { visle } from 'visle/build'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [visle({ serverBuild: 'integrated' }), cloudflare({ viteEnvironment: { name: 'ssr' } })],
})
```

The runtime provider plugin must come after `visle()` so that its server input and runtime-specific
options are merged into the `ssr` environment without replacing Visle's build orchestration.

The exact runtime-provider API varies by platform. See the
[Cloudflare Workers recipe](../recipes/cloudflare-workers.md) for a complete setup using
`@cloudflare/vite-plugin`.

## Use the Vite Loader

The application entry can create its renderer directly with `createViteLoader()`:

```ts
// src/server.ts
import { createRender } from 'visle'
import { createViteLoader } from 'visle/vite'

const render = createRender({
  loader: createViteLoader(),
})

export async function renderHome() {
  return render('index')
}
```

The `visle/vite` module imports virtual entry and manifest modules supplied by the Visle plugin. It
must be processed by Vite with `serverBuild: 'integrated'`; do not run the source entry directly
with Node.js or another TypeScript runner.

## Development and Production

The same application entry is used in both environments:

- During development, page components are loaded through Vite's running `ssr` environment, and
  client assets use Vite's development URLs and HMR.
- During production builds, Visle builds page CSS and island JavaScript first, then exposes the
  resolved page entries and asset manifest to the application server bundle.

The runtime provider is responsible for starting the development server, setting the server entry,
and packaging or deploying the final `ssr` output. You do not need `createDevLoader()`, a separate
production entry, or a static import from `dist/server` in this mode.

## Custom Output Directories

`serverOutDir` and `clientOutDir` still control Visle's Vite environment outputs:

```ts
visle({
  serverBuild: 'integrated',
  serverOutDir: 'build/server',
  clientOutDir: 'build/client',
})
```

Before changing them, check whether the runtime provider expects a particular output layout.
