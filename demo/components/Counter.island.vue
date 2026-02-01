<script setup lang="ts">
import { ref } from 'vue'
import Child from './nested/Child.island.vue'

const count = ref(0)
</script>

<template>
  <button @click="count++">Clicked {{ count }} times</button>
  <Child :initial-count="10" />
</template>
