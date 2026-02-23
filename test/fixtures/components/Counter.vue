<script setup lang="ts">
const { count = 0 } = defineProps<{
  count?: number
}>()
</script>

<template>
  <button>Count: {{ count }}</button>
</template>
