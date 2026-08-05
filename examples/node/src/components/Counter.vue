<script setup lang="ts">
import { ref } from 'vue'

const count = ref(0)
</script>

<template>
  <button type="button" @click="count++">Count: {{ count }}</button>
</template>

<style scoped>
button {
  padding: 0.75rem 1rem;
  color: white;
  background: #1f2937;
  border: 0;
  border-radius: 0.5rem;
  cursor: pointer;
}
</style>
