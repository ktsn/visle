<script>
export default {
  props: {
    count: {
      type: Number,
      default: 0,
    },
  },
}
</script>

<template>
  <button>Options Count: {{ count }}</button>
</template>
