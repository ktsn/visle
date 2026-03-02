<script setup>
import AliasStyledCounter from '../components/AliasStyledCounter.vue'
</script>

<template>
  <div>
    <h1>Alias Styled Page</h1>
    <AliasStyledCounter v-client:load />
  </div>
</template>

<style>
h1 {
  color: red;
}
</style>
