# Development

Visle provides a dev loader that integrates with Vite's dev server for hot module replacement (HMR) and on-the-fly component compilation.

## Setting Up the Dev Loader

Use `createDevLoader()` from `visle/dev` to create a development loader and connect it to your render instance with `setLoader()`:

```ts
import { createRender } from 'visle'
import { createDevLoader } from 'visle/dev'

const render = createRender()

// Create dev loader and set it to render function on development
const loader = createDevLoader()
render.setLoader(loader)
```

The loader also provides a Connect-compatible middleware for serving Vite's development assets. You need to add `loader.middleware` to your server:

```ts
import express from 'express'
import { createRender } from 'visle'
import { createDevLoader } from 'visle/dev'

const app = express()

const render = createRender()

if (process.env.NODE_ENV === 'production') {
  // Serve client assets built with Vite on production
  app.use('/assets', express.static('dist/client/assets'))
} else {
  // Set dev loader and serve Vite dev assets on development
  const loader = createDevLoader()
  render.setLoader(loader)

  app.use(loader.middleware)
}

app.get('/', async (req, res) => {
  const html = await render('index')
  res.send(html)
})

app.listen(3000)
```

## Custom Vite Config

You can pass Vite configuration to `createDevLoader()`. The dev loader automatically loads your Vite config file, so in most cases you only need to write your settings in the Vite config without using inline config:

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
