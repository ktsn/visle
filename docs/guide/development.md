# Development

Visle provides a dev loader that integrates with Vite's dev server for hot module replacement (HMR) and on-the-fly component compilation.

## Setting Up the Dev Loader

Application and route definitions can own one shared renderer without importing development-only dependencies:

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

The development-only entry imports `createDevLoader()` from `visle/dev` and installs it before serving requests. The loader also provides Connect-compatible middleware for serving Vite's development assets:

```ts
// src/dev.ts
import { createDevLoader } from 'visle/dev'

import { app, render } from './app.ts'

// Set dev loader and serve Vite dev assets in development
const loader = createDevLoader()

render.setLoader(loader)
app.use(loader.middleware)

app.listen(3000)
```

Only `src/dev.ts` imports `visle/dev` and therefore Vite. The production entry can import the same renderer and install the static production loader described in the [production guide](./production.md).

## Custom Vite Config

You can pass Vite configuration to `createDevLoader()`. The dev loader automatically loads your Vite config file, so in most cases you only need to write your settings in the Vite config without passing inline config:

```ts
const loader = createDevLoader({
  // Any Vite InlineConfig options
  server: {
    port: 5173,
  },
})
```

## Cleanup

Call `loader.close()` to shut down the dev server when you're done:

```ts
await loader.close()
```
