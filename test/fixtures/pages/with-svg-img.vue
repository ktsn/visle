<script setup>
import iconUrl from '../assets/icon.svg'
import Counter from '../components/Counter.vue'
</script>

<template>
  <div class="wrapper">
    <h1>SVG Image</h1>
    <img :src="iconUrl" alt="icon" />
    <Counter v-client:load />
  </div>
</template>

<style>
.wrapper {
  background-image: url(../assets/icon.svg);
}
</style>
