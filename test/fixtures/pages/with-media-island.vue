<script setup>
import Counter from '../components/Counter.vue'
</script>

<template>
  <div>
    <Counter v-client:media="'(max-width: 768px)'" :count="5" />
  </div>
</template>
