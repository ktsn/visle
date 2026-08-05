import entryImports from 'virtual:visle/vite-entries'
import manifestSource from 'virtual:visle/vite-manifest'

import { createBundleLoader } from './bundle-loader.js'
import type { RenderLoader } from './render.js'

/**
 * Creates a loader backed by virtual modules from the current Vite server
 * environment. This module must be processed by the Visle Vite plugin in
 * integrated mode.
 */
export function createViteLoader(): RenderLoader {
  return createBundleLoader({ entries: entryImports, manifest: manifestSource })
}
