<script>
import OptionsCounter from '../components/OptionsCounter.vue'

export default {
  components: {
    OptionsCounter,
  },
}
</script>

<template>
  <div>
    <h1>Options API Page</h1>
    <OptionsCounter v-client:load />
  </div>
</template>
