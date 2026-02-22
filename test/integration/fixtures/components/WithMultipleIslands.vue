<script setup>
import CounterA from './CounterA.vue'
import CounterB from './CounterB.vue'
</script>

<template>
  <div>
    <CounterA v-client:load />
    <CounterB v-client:load />
  </div>
</template>
