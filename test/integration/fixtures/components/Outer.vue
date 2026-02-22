<script setup>
import Inner from './Inner.vue'
</script>

<template>
  <div class="outer">
    <span>Outer</span>
    <Inner v-client:load />
  </div>
</template>
