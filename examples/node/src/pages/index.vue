<script setup lang="ts">
import Counter from '../components/Counter.vue'

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
      <main>
        <h1>{{ title }}</h1>
        <p>This page is rendered by Express and hydrated by Visle.</p>
        <Counter v-client:load />
      </main>
    </body>
  </html>
</template>

<style>
body {
  margin: 0;
  color: #1f2937;
  background: #f8fafc;
  font-family: system-ui, sans-serif;
}

main {
  width: min(40rem, calc(100% - 2rem));
  margin: 6rem auto;
}
</style>
