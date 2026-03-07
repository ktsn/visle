<script setup>
import StyledCounter from '../components/StyledCounter.vue'
</script>

<template>
  <div>
    <h1>Shared Styled Page</h1>
    <StyledCounter v-client:load />
  </div>
</template>

<style>
h1 {
  font-size: 2rem;
}
</style>
