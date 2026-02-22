<script setup>
import Counter from '../components/Counter.vue'
</script>

<template>
  <html>
    <head>
      <title>Test Document</title>
    </head>
    <body>
      <h1>Document</h1>
      <Counter v-client:load />
    </body>
  </html>
</template>
