# Production

In production, Visle serves pre-built assets from the Vite build output.

## Build Output

Running `vite build` produces two directories:

- **`dist/client`** (default) — Client-side assets (CSS, island JavaScript)
- **`dist/server`** (default) — Server-side components for HTML rendering and the asset manifest

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

Serve the `dist/client` directory as static files so that CSS and island JavaScript are available to the browser:

```ts
import express from 'express'
import { createRender } from 'visle'

const app = express()
const render = createRender()

// Serve the built assets
app.use('/assets', express.static('dist/client/assets'))

app.get('/', async (req, res) => {
  const html = await render('index')
  res.send(html)
})

app.listen(3000)
```

## Custom `serverOutDir`

If you customize `serverOutDir` in the Visle plugin, pass the same value to `createRender()`:

```ts
const render = createRender({
  serverOutDir: 'custom/server',
})
```

This tells the render function where to find the pre-built server components and manifest.
