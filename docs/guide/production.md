# Production

In production, Visle serves pre-built assets from the Vite build output. No dev loader is needed.

## Build Output

Running `vite build` produces two directories:

- **`dist/client`** (default) — Client-side assets (CSS, island JavaScript)
- **`dist/server`** (default) — Server-side entry and manifest

You can customize these paths in the Visle plugin config:

```ts
import { visle } from 'visle/build'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    visle({
      clientOutDir: 'dist/client',
      serverOutDir: 'dist/server',
    }),
  ],
})
```

## Serving Static Assets

Serve the `dist/client` directory as static files so that CSS and island JavaScript are available to the browser.

### Express

```ts
import express from 'express'
import { createRender } from 'visle'

const app = express()
const render = createRender()

app.use('/assets', express.static('dist/client/assets'))

app.get('/', async (req, res) => {
  const html = await render('index')
  res.send(html)
})

app.listen(3000)
```

### Hono

```ts
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { app } from './server.ts'

app.use('/assets/*', serveStatic({ root: 'dist/client' }))

serve({ fetch: app.fetch, port: 3000 })
```

## Custom `serverOutDir`

If you customize `serverOutDir` in the Visle plugin, pass the same value to `createRender()`:

```ts
const render = createRender({
  serverOutDir: 'custom/server',
})
```

This tells the render function where to find the pre-built server components and manifest.

## No Loader in Production

In production mode, `createRender()` loads components directly from the build output. There is no need to call `setLoader()` or use `createDevLoader()`.
