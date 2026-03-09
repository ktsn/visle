# Development

Visle provides a dev loader that integrates with Vite's dev server for hot module replacement (HMR) and on-the-fly component compilation.

## Setting Up the Dev Loader

Use `createDevLoader()` from `visle/dev` to create a development loader:

```ts
import { createDevLoader } from 'visle/dev'

const loader = createDevLoader()
```

Connect the loader to your render instance with `setLoader()`:

```ts
import { createRender } from 'visle'

const render = createRender()
const loader = createDevLoader()
render.setLoader(loader)
```

The loader also provides a Connect-compatible middleware for serving Vite's development assets. You need to add `loader.middleware` to your server.

## Express Example

```ts
import express from 'express'
import { createRender } from 'visle'
import { createDevLoader } from 'visle/dev'

const app = express()
const render = createRender()
const loader = createDevLoader()
render.setLoader(loader)

// Serve Vite dev assets
app.use(loader.middleware)

app.get('/', async (req, res) => {
  const html = await render('index')
  res.send(html)
})

app.listen(3000)
```

## Hono Example

With Hono, use `loader.middleware` as a Connect middleware by wrapping the request listener:

```ts
// app/server.ts
import { Hono } from 'hono'
import { createRender, type VisleEntries } from 'visle'

const app = new Hono()
const render = createRender<VisleEntries>()

app.get('/', async (c) => {
  const html = await render('index')
  return c.html(html)
})

export { app, render }
```

```ts
// app/dev.ts
import http from 'node:http'
import { getRequestListener } from '@hono/node-server'
import { createDevLoader } from 'visle/dev'
import { app, render } from './server.ts'

const loader = createDevLoader()
render.setLoader(loader)

const requestListener = getRequestListener(app.fetch)

const server = http.createServer((req, res) => {
  loader.middleware(req, res, () => {
    requestListener(req, res)
  })
})

server.listen(3000)
```

## Custom Vite Config

You can pass Vite configuration to `createDevLoader()`:

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
