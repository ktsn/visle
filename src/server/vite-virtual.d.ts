declare module 'virtual:visle/vite-entries' {
  import type { Component } from 'vue'

  const entries: Record<string, () => Promise<Component>>
  export default entries
}

declare module 'virtual:visle/vite-manifest' {
  import type { ManifestSource } from '../shared/manifest.js'

  const manifest: ManifestSource
  export default manifest
}
