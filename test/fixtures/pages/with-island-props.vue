<script setup>
import Counter from '../components/Counter.vue'
</script>

<template>
  <div>
    <Counter v-client:load :count="42" label="Click me" />
  </div>
</template>
