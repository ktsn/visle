<script setup lang="ts">
import { Counter } from '../components/named-import'
</script>

<template>
  <div>
    <h1>Page</h1>
    <Counter v-client:load />
  </div>
</template>
