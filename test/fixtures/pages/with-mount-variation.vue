<script setup>
import Counter from '../components/Counter.vue'
</script>

<template>
  <div>
    <Counter v-client:load :count="1" />
    <Counter :count="2" />
  </div>
</template>
