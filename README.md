# Visle

## Usage

Directory structure with Vue Islands Renderer will be like this:

```
├─ vite.config.ts
├─ pages/
│   ├─ index.vue
│   └...
├─ components/
│   ├─ Counter.vue
│   └...
├─ dist/
│   ├─ server/
│   └– client/
```

Add the Visle plugin to your `vite.config.ts`:

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import { visle } from 'visle/build'

export default defineConfig({
  plugins: [
    visle({
      entryDir: 'pages',
    }),
  ],
})
```

### `v-client:load` Directive

Use the `v-client:load` directive to mark a component as an island. Island components are server-side rendered like any other component, but they are also bundled for the client and hydrated in the browser. Components without the directive are only rendered on the server and sent as static HTML.

```vue
<template>
  <!-- This component will be hydrated on the client -->
  <Counter v-client:load />

  <!-- Props are passed to the client as well -->
  <ImageCarousel v-client:load :images="images" />

  <!-- This component is static server-rendered HTML -->
  <Footer />
</template>
```

### Example

Add the following Vue components into `pages/` directory:

```vue
<script setup lang="ts">
// pages/index.vue
import Counter from '../components/Counter.vue'
</script>

<template>
  <div>
    <h1>Hello, World!</h1>
    <Counter v-client:load />
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
// components/Counter.vue
import { ref } from 'vue'

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
import { createDevLoader } from 'visle/dev'

const render = createRender()

const app = express()

const loader = createDevLoader()
render.setLoader(loader)

// Pass the middleware provided by the dev loader to handle assets.
app.use(loader.middleware)

app.get('/', async (req, res) => {
  // Render pages/index.vue as a HTML string.
  // Extensions must be omitted.
  const html = await render('index')
  res.send(html)
})

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
import { createDevLoader } from 'visle/dev'
+import * as path from 'node:path'
+
+const isDev = process.env.NODE_ENV !== 'production'

const render = createRender()

const app = express()

-const loader = createDevLoader()
-render.setLoader(loader)
-
-// Pass the middleware provided by the dev loader to handle assets.
-app.use(loader.middleware)
+if (isDev) {
+  const loader = createDevLoader()
+  render.setLoader(loader)
+
+  // Pass the middleware provided by the dev loader to handle assets.
+  app.use(loader.middleware)
+} else {
+  // Serve client asset files from the dist directory.
+  app.use(express.static(path.resolve('dist/client')))
+}

app.get('/', async (req, res) => {
  // Render pages/index.vue as a HTML string.
  // Extensions must be omitted.
  const html = await render('index')
  res.send(html)
})

// Start the server.
app.listen(3000)
```

By not passing `loader` to `render.setLoader`, the `render` function will import Vue components with
the native `import()` function and it automatically imports them from the corresponding built component
in the `dist/server` directory.

To build components, run the following command:

```bash
vite build
```
