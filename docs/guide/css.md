# CSS Handling

Visle automatically handles CSS extraction and injection for your page components.

## Per-Entry CSS Splitting

CSS is split per entry component. When you render a page, only the CSS needed for that page is included in the HTML output as `<link>` elements.

This includes CSS from the entry component itself and all transitively imported components. If your page imports a layout component that imports a button component, all their styles are collected and injected.

## How It Works

1. During the build, Visle extracts CSS from each entry component and its dependencies
2. CSS files are written to `dist/client/assets/`
3. At render time, the render function looks up which CSS files belong to the current entry
4. `<link>` elements are injected into the rendered HTML

## Customizing CSS Chunking

You can customize how CSS is chunked using Vite's `manualChunks` option on the `style` environment:

```ts
import { visle } from 'visle/build'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [visle()],
  environments: {
    style: {
      build: {
        rollupOptions: {
          output: {
            manualChunks: {
              // Group common styles into a shared chunk
              common: ['./src/styles/common.css'],
            },
          },
        },
      },
    },
  },
})
```

This is useful when multiple pages share common styles and you want to avoid duplicating them across entry CSS files.
