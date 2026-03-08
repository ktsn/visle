<script setup lang="ts">
import { defineAsyncComponent } from 'vue'

const StyledCounter = defineAsyncComponent(() => import('./StyledCounter.vue'))
</script>

<template>
  <h2>Async Component</h2>
  <StyledCounter />
</template>
