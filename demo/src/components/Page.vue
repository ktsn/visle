<script setup lang="ts">
import { computed } from 'vue'
import Counter from './Counter.client.vue'

// DEMO
import { marked } from 'marked' // 35.9K (11.2K gzipped)
import sanitizeHtml from 'sanitize-html' // 206K (63.3K gzipped)
import DefaultLayout from './DefaultLayout.vue'

const { title } = defineProps<{
  title: string
}>()

const content = computed((): string => {
  return sanitizeHtml(
    marked(`
# ${title}

## Subtitle

This is a [link](https://example.com).
    `) as string,
  )
})
</script>

<template>
  <DefaultLayout :title="title">
    <div class="wrapper">
      <div class="content" v-html="content"></div>
      <Counter />
    </div>
  </DefaultLayout>
</template>