# CSS Handling

Visle automatically handles CSS extraction and injection for your components.

## Per-Entry CSS Splitting

CSS is split per entry component. When you render a component with the render function, only the CSS needed for that page is included in the HTML output as `<link>` elements.

This includes CSS from the entry component itself and all transitively imported components. If your page imports another component with CSS, all their styles are collected and injected.

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
