<script setup lang="ts">
import DefaultLayout from './DefaultLayout.vue'
</script>

<template>
  <DefaultLayout title="Static">
    <div :class="$style.wrapper">
      <h1 :class="$style.title">Static</h1>
      <p>This is static page that does not include any client components.</p>
      <a href="/">Root</a>
    </div>
  </DefaultLayout>
</template>

<style module>
.wrapper {
  padding: 20px;
}

.title {
  font-weight: lighter;
}
</style>