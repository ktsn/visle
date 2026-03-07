<script setup>
import { defineAsyncComponent } from 'vue'

const StyledCounter = defineAsyncComponent(
  () => import('../components/StyledCounter.vue'),
)
</script>

<template>
  <div>
    <h1>Dynamic Shared Styled Page</h1>
    <StyledCounter v-client:load />
  </div>
</template>

<style>
h1 {
  font-weight: bold;
}
</style>
