<script setup>
import StyledCounter from './StyledCounter.vue'
</script>

<template>
  <div>
    <h1>Styled Page</h1>
    <StyledCounter v-client:load />
  </div>
</template>

<style>
h1 {
  color: red;
}
</style>
