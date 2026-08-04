import type { Component } from 'vue'

import type { ManifestData } from '../shared/manifest.js'
import { createRuntimeManifest } from './manifest.js'
import type { RenderLoader } from './render.js'

export interface StaticRuntime {
  entries: Record<string, Component>
  manifest: ManifestData
}

/**
 * Creates a render loader backed entirely by statically imported build output.
 */
export function createStaticLoader(runtime: StaticRuntime): RenderLoader {
  const manifest = createRuntimeManifest(runtime.manifest)

  return {
    async loadEntry(componentPath) {
      if (!Object.hasOwn(runtime.entries, componentPath)) {
        throw new Error(`[visle] Unknown entry component: ${componentPath}`)
      }
      return runtime.entries[componentPath]!
    },

    async getManifest() {
      return manifest
    },
  }
}
