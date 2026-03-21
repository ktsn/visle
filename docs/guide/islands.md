# Islands Architecture

Visle uses the Islands Architecture pattern. Your pages are rendered as static HTML on the server, and only the interactive parts — called "islands" — are hydrated on the client.

## What Are Islands?

An island is a Vue component that needs to be interactive in the browser. The rest of the page remains static HTML with zero JavaScript.

To make a component an island, use the `v-client` directive in your template. Any Vue component can become an island. You can specify a hydration strategy after `v-client:` to control when the component is hydrated.

### `v-client:load`

Hydrates the component immediately when the page loads:

```vue
<MyComponent v-client:load />
```

### `v-client:visible`

Defers hydration until the component enters the viewport, using `IntersectionObserver`:

```vue
<MyComponent v-client:visible />
```

You can customize the `rootMargin` to start hydration before the component is fully visible:

```vue
<MyComponent v-client:visible="{ rootMargin: '100px' }" />
```

This triggers hydration when the component is within 100px of the viewport.

### `v-client:idle`

Defers hydration until the browser is idle, using `requestIdleCallback`:

```vue
<MyComponent v-client:idle />
```

You can specify a maximum wait time with `timeout`. The following example forces hydration after 2 seconds:

```vue
<MyComponent v-client:idle="{ timeout: 2000 }" />
```

If the browser does not support `requestIdleCallback`, hydration occurs after the `window`'s `load` event.

### `v-client:media`

Defers hydration until the specified media query matches. The following example hydrates when the browser width is 768px or less:

```vue
<MyComponent v-client:media="'(max-width: 768px)'" />
```

Note that the value passed to the directive is a JavaScript string literal — wrapped in single quotes inside the double quotes.

## Props

Props passed to island components must be serializable. The following values are supported:

- Strings, numbers, booleans, `null`, `undefined`
- Plain objects and arrays
- `Date`
- `RegExp`
- `Map` and `Set`
- `URL`
- `BigInt`
- `Infinity`, `-Infinity`, `NaN`

Functions, symbols, class instances, and circular references are not supported and will throw an error.

```vue
<!-- OK -->
<ProductCard
  v-client:load
  :product="{
    id: 1,
    name: 'Shirt',
    tags: new Set(['vue', 'visle']),
  }"
></ProductCard>

<!-- Not supported: function prop -->
<ProductCard v-client:load :get-product="(id) => productStore.get(id)"></ProductCard>
```

## How It Works

Each island component gets its own JavaScript bundle. When the page loads:

1. The server renders the full page as HTML, including the island's initial content
2. Island components are wrapped in `<vue-island>` custom elements
3. Based on the hydration strategy, the browser loads the island's JavaScript
4. The island is hydrated on top of the server-rendered HTML, making it interactive

This approach minimizes the amount of JavaScript sent to the client — only the code for interactive components is loaded.
