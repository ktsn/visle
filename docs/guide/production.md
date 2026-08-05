# Production

In production, Visle renders from a statically imported build artifact.

The default `serverBuild: 'components'` mode builds the page components for consumption by an
external application server build. If another Vite plugin owns the complete application server
build, use [integrated mode](./integrated-mode.md) instead.

## Build Output

Running `vite build` produces two directories:

- **`dist/client`** (default) — Client-side assets (CSS, island JavaScript)
- **`dist/server`** (default) — Server-side components, `visle-manifest.json`, and `visle-bundle.js`

You can customize the output paths in the Visle plugin config:

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

## Configure the Production Loader

Application and route definitions can own one shared renderer without knowing their environment:

```ts
// src/app.ts
import express from 'express'
import { createRender } from 'visle'

const app = express()
const render = createRender()

app.get('/', async (req, res) => {
  const html = await render('index')
  res.send(html)
})

export { app, render }
```

The production entry imports the generated bundle and installs its loader before serving requests:

```ts
// src/prod.ts
import express from 'express'
import { createBundleLoader } from 'visle'
import bundle from '../dist/server/visle-bundle.js'

import { app, render } from './app.ts'

render.setLoader(createBundleLoader(bundle))

// Serve the built assets
app.use('/assets', express.static('dist/client/assets'))

app.listen(3000)
```

If `serverOutDir` is customized, update the bundle import path.
