<script setup lang="ts">
import { ref } from "vue";

const { initialCount } = defineProps<{
	initialCount: number;
}>();

const count = ref(initialCount);
</script>

<template>
  <div>
    <h1>Child</h1>
    <p>Count: {{ count }}</p>
    <button @click="count++">Increment</button>
  </div>
</template>