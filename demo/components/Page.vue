<script setup lang="ts">
import Counter from "./Counter.client.vue";

defineProps<{
	title: string;
	content: string;
}>();
</script>

<template>
  <div class="wrapper">
    <h1>{{ title }}</h1>
    <p>{{ content }}</p>
    <Counter />
  </div>
</template>