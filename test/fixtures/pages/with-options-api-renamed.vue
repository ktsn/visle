<script>
import OptionsCounter from '../components/OptionsCounter.vue'

export default {
  components: {
    RenamedCounter: OptionsCounter,
  },
}
</script>

<template>
  <div>
    <h1>Options API Renamed Page</h1>
    <RenamedCounter v-client:load />
  </div>
</template>
