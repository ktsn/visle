<script setup>
import DynamicImport from '../components/DynamicImport.vue'
</script>

<template>
  <div>
    <h1>Dynamic Shared Styled Page</h1>
    <DynamicImport v-client:load />
  </div>
</template>

<style>
h1 {
  font-weight: bold;
}
</style>
