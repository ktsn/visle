# Cloudflare Workers

This recipe runs a Visle application on Cloudflare Workers with the Cloudflare Vite plugin. The
Worker and Visle share Vite's `ssr` environment, so the same server entry works in development,
preview, and production.

This example uses [Hono](https://hono.dev/) for routing, but Visle can work with any
Worker-compatible server that returns a `Response`.

## Install the Dependencies

Starting from an existing Visle project, install Hono, the Cloudflare Vite plugin, and Wrangler:

```sh
pnpm add hono
pnpm add -D @cloudflare/vite-plugin wrangler
```

## Configure Vite

Enable Visle's [integrated mode](../guide/integrated-mode.md), then attach the Worker to the same
`ssr` environment:

```ts
// vite.config.ts
import { cloudflare } from '@cloudflare/vite-plugin'
import { visle } from 'visle/build'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [visle({ serverBuild: 'integrated' }), cloudflare({ viteEnvironment: { name: 'ssr' } })],
})
```

Keep `cloudflare()` after `visle()`. Both plugins contribute configuration to `ssr`, and this order
lets the Cloudflare plugin add the Worker entry and Workers runtime without replacing Visle's build
orchestration.

## Configure the Worker

Point Wrangler at the application server entry:

```jsonc
// wrangler.jsonc
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "my-visle-app",
  "main": "src/server.ts",
  "compatibility_date": "2026-08-05",
}
```

Use the current date when creating a new project, and update it deliberately when adopting newer
Workers runtime behavior.

You do not need to configure `assets.directory`. The Cloudflare Vite plugin detects Visle's built
`client` environment and writes the correct static asset directory into the generated deployment
configuration.

## Create the Worker Entry

Use `createViteLoader()` in the server entry that Wrangler builds:

```ts
// src/server.ts
import { Hono } from 'hono'
import { createRender } from 'visle'
import { createViteLoader } from 'visle/vite'

const app = new Hono()
const render = createRender({
  loader: createViteLoader(),
})

app.get('/', async (c) => {
  const html = await render('index', { title: 'Hello from Workers' })
  return c.html(html)
})

export default app
```

Create the page rendered by that route:

```vue
<!-- src/pages/index.vue -->
<script setup lang="ts">
defineProps<{
  title: string
}>()
</script>

<template>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>{{ title }}</title>
    </head>
    <body>
      <h1>{{ title }}</h1>
    </body>
  </html>
</template>
```

## Add Project Scripts

Use Vite for development, builds, and local production previews. Build before deploying so Wrangler
can use the generated Worker configuration:

```json
{
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "preview": "vite preview",
    "deploy": "vite build && wrangler deploy"
  }
}
```

Run the development server:

```sh
pnpm dev
```

For a production-like local check, build and preview the output in the Workers runtime:

```sh
pnpm build
pnpm preview
```

Deploy after authenticating Wrangler with your Cloudflare account:

```sh
pnpm deploy
```

The build creates the Worker bundle and its deployment configuration under `dist/server`, alongside
Visle's client assets under `dist/client`.
