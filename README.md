# Visle

## Usage

Directory structure with Vue Islands Renderer will be like this:

```
├─ visle.config.ts
├─ components/
│   ├─ Page.vue
│   ├─ Counter.island.vue
│   └...
├─ dist/
│   ├─ server/
│   └– client/
```

Add the following Vue components into `components/` directory:

```vue
<script setup lang="ts">
// components/Page.vue
import Counter from './Counter.island.vue'
</script>

<template>
  <div>
    <h1>Hello, World!</h1>
    <Counter />
  </div>
</template>

<style scoped>
h1 {
  color: #333;
  font-weight: lighter;
}
</style>
```

```vue
<script setup lang="ts">
// components/Counter.island.vue
const count = ref(0)
</script>

<template>
  <button @click="count++">
    {{ count }}
  </button>
</template>
```

Then use `createRender` function to create a render function of Vue components:

```ts
// app/server.ts
import express from 'express'
import { createRender } from 'visle'

const render = createRender({
  isDev: true,
})

const app = express()

app.get('/', async (req, res) => {
  // Render components/Page.vue as a HTML string.
  // Extensions must be omitted.
  const html = await render('Page')
  res.send(html)
})

// Pass the middlewares provided by render function to handle assets.
app.use(render.devMiddlewares)

// Start the server.
app.listen(3000)
```

Start the server by the command `node app/server.js` and visit `http://localhost:3000` to see the result.

### Production Build

The render function usage in the previous section is for development. It dynamically loads Vue components
and assets when they are requested by a client. While it is useful during development as it can detect
file changes and provide HMR, it is not suitable for production environment.

To make it ready for production, update `app/server.ts` as follows:

```diff
// app/server.ts
import express from 'express'
import { createRender } from 'visle'
+import * as path from 'node:path'

const isDev = process.env.NODE_ENV !== 'production'

const render = createRender({
-  isDev: true,
+  isDev,
})

const app = express()

app.get('/', async (req, res) => {
  // Render components/Page.vue as a HTML string.
  // Extensions must be omitted.
  const html = await render('Page')
  res.send(html)
})

-// Pass the middlewares provided by render function to handle assets.
-app.use(render.devMiddlewares)
+if (isDev) {
+  // Pass the middlewares provided by render function to handle assets.
+  app.use(render.devMiddlewares)
+} else {
+  // Serve client asset files from the dist directory.
+  app.use(express.static(path.resolve('dist/client')))
+}

// Start the server.
app.listen(3000)
```

By passing `isDev: true` to `createRender`, the `render` function will import Vue components with
the native `import()` function and it automatically imports them from the corresponding built component
in the `dist/server` directory.

To build components, run the following command:

```bash
visle build
```
