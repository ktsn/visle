import type { Component } from 'vue'

import type { ManifestSource } from '../shared/manifest.js'
import { createRuntimeManifest } from './manifest.js'
import type { RenderLoader } from './render.js'

export interface LoaderSource {
  entries: Record<string, () => Component | Promise<Component>>
  manifest: ManifestSource
}

/**
 * Creates a render loader from a page entry bundle and its asset manifest.
 */
export function createBundleLoader(source: LoaderSource): RenderLoader {
  const manifest = createRuntimeManifest(source.manifest)

  return {
    async loadEntry(componentPath) {
      const load = source.entries[componentPath]
      if (!load) {
        throw new Error(`[visle] Unknown entry component: ${componentPath}`)
      }
      return load()
    },

    async getManifest() {
      return manifest
    },
  }
}
