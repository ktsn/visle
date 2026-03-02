<script setup>
import ExternalStyledCounter from '../components/ExternalStyledCounter.vue'
</script>

<template>
  <div>
    <h1>External Styled Page</h1>
    <ExternalStyledCounter v-client:load />
  </div>
</template>

<style>
h1 {
  color: red;
}
</style>
