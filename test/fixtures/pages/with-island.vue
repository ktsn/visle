<script setup>
import Counter from '../components/Counter.vue'
</script>

<template>
  <div>
    <h1>Page</h1>
    <Counter v-client:load />
  </div>
</template>
