---
layout: home

hero:
  name: Visle
  tagline: Islands Architecture Renderer for Vue.js
---

> [!WARNING]
> This library is not production ready yet. Use at your own risk.

## Getting Started

Visle is not a framework — it is an HTML renderer that uses Vue templates as a template engine. It renders pages on the server as static HTML, and lets you selectively hydrate interactive parts as islands on the client.

Because Visle only handles rendering, it does not lock you into a specific framework structure. You choose your own server, routing, and data fetching — Visle just turns your Vue components into HTML.

### Installation

```sh
npm install visle vite vue
```

### Configure Vite

Create a `vite.config.ts` with the `visle()` plugin:

```ts
import { visle } from 'visle/build'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [visle()],
})
```

Do not add `@vitejs/plugin-vue` since Visle plugin includes it internally.

### Create a Page Component

Create a Vue component in the `src/pages/` directory. This is the default entry directory for Visle.

```vue
<!-- src/pages/index.vue -->
<script setup lang="ts">
import Counter from '../components/Counter.vue'
</script>

<template>
  <html>
    <head>
      <title>My Page</title>
    </head>
    <body>
      <h1>Hello from Visle!</h1>
      <Counter v-client:load />
    </body>
  </html>
</template>
```

```vue
<!-- src/components/Counter.vue -->
<script setup lang="ts">
import { ref } from 'vue'

const count = ref(0)
</script>

<template>
  <button @click="count++">Count: {{ count }}</button>
</template>
```

Components used with a `v-client` directive become interactive islands that are hydrated on the client.

### Create a Server Entry

Create a server file (e.g. `server.ts`) that uses `createRender()` to render pages to HTML. This example uses Express, but you can use any server library such as Hono, Fastify, or the built-in `node:http` module:

```ts
// server.ts
import express from 'express'
import { createRender } from 'visle'

const app = express()

// Visle's render function
const render = createRender()

// Serve client assets built with Vite
app.use('/assets', express.static('dist/client/assets'))

app.get('/', async (req, res) => {
  // Render html string with src/pages/index.vue
  const html = await render('index')
  res.send(html)
})

app.listen(3000)
```

### Build and Run

Build the client assets with Vite, then run your server entry directly. Access `http://localhost:3000` to see the rendered page:

```sh
npx vite build
node server.ts
```

### What's Next?

Learn more about how islands work and the available hydration strategies in the [Islands Architecture](./guide/islands) guide.
