<script setup>
import CounterA from '../components/CounterA.vue'
import CounterB from '../components/CounterB.vue'
</script>

<template>
  <div>
    <CounterA v-client:load />
    <CounterB v-client:load />
  </div>
</template>
