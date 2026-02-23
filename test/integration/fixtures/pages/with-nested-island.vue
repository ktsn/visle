<script setup>
import Outer from '../components/Outer.vue'
</script>

<template>
  <div>
    <Outer v-client:load />
  </div>
</template>
