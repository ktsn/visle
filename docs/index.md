---
layout: home

hero:
  name: Visle
  tagline: Islands Architecture Renderer for Vue.js
---

## Getting Started

Visle is an Islands Architecture renderer for Vue.js. It renders pages on the server as static HTML and selectively hydrates interactive components (islands) on the client.

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

### Create a Page Component

Create a Vue component in the `pages/` directory. This is the default entry directory for Visle.

```vue
<!-- pages/index.vue -->
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

Components used with a `v-client` directive become interactive islands that are hydrated on the client.

### Create a Server Entry

Create a server file (e.g. `server.ts`) that uses `createRender()` to render pages to HTML:

```ts
// server.ts
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

### Build and Run

Build the client assets with Vite, then run your server entry directly:

```sh
npx vite build
node server.ts
```

### What's Next?

Learn more about how islands work and the available hydration strategies in the [Islands Architecture](./guide/islands) guide.
