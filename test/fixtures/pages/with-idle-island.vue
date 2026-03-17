<script setup>
import Counter from '../components/Counter.vue'
</script>

<template>
  <div>
    <Counter v-client:idle :count="5" />
  </div>
</template>
