<script setup lang="ts">
interface Props {
  title: string
}

defineProps<Props>()
</script>

<template>
  <html lang="en">
    <head>
    <title>{{ title }}</title>
    </head>
    <body>
      <slot></slot>
    </body>
  </html>
</template>