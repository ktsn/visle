<script setup lang="ts">
import NamedExportIsland, { name as islandName } from '../components/NamedExportIsland.vue'
import NamedExportServer, { name as serverName } from '../components/NamedExportServer.vue'
</script>

<template>
  <div>{{ islandName }}</div>
  <div>{{ serverName }}</div>
  <NamedExportIsland v-client:load />
  <NamedExportServer />
</template>
