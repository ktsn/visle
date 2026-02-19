<script setup lang="ts">
interface Props {
  title: string
}

defineProps<Props>()
</script>

<template>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, minimum-scale=1" />
      <link rel="expect" href="#main-content" blocking="render" />
      <title>{{ title }}</title>
    </head>
    <body>
      <header :class="$style['site-header']">
        <div :class="$style.container">
          <a href="/" :class="$style['site-name']">Shop</a>
        </div>
      </header>
      <main :class="$style.main">
        <div :class="$style.container">
          <slot />
        </div>
      </main>
    </body>
  </html>
</template>

<style>
@media (prefers-reduced-motion: no-preference) {
  @view-transition {
    navigation: auto;
  }
}

*,
*::before,
*::after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  color: #1a1a1a;
  background: #fafafa;
  line-height: 1.6;
}

a {
  color: inherit;
  text-decoration: none;
}

img {
  max-width: 100%;
  display: block;
}
</style>

<style module>
.site-header {
  background: #fff;
  border-bottom: 1px solid #e5e5e5;
  padding: 16px 0;
}

.container {
  max-width: 960px;
  margin: 0 auto;
  padding: 0 20px;
}

.site-name {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.5px;
}

.site-name:hover {
  opacity: 0.7;
}

.main {
  padding: 32px 0;
}
</style>
