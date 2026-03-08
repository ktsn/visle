<script setup>
import Counter from '../components/Counter.vue'
</script>

<template>
  <div>
    <div style="height: 2000px">Spacer</div>
    <Counter v-client:visible :count="10" />
  </div>
</template>
