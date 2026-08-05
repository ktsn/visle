import type { ViteDevServer } from 'vite'

import type { RuntimeManifest } from '../server/manifest.js'
import { virtualIslandsBootstrapPath } from '../shared/entry.js'
import { getServerEnvironment } from './index.js'
import { collectDevEntryCssIds } from './style.js'

/**
 * Creates a dev-mode RuntimeManifest that resolves source and virtual asset URLs.
 */
export function createDevManifest(devServer: ViteDevServer): RuntimeManifest {
  const { base } = devServer.config
  const origin = devServer.config.server.origin?.replace(/\/$/, '') ?? ''
  const basePath = basePathForDev(base)

  function applyServeBase(filePath: string): string {
    return `${origin}${basePath}${filePath}`
  }

  return {
    async getClientImportId(componentRelativePath: string): Promise<string> {
      return applyServeBase(`/${componentRelativePath}`)
    },

    async getIslandsBootstrapId(): Promise<string> {
      return applyServeBase(virtualIslandsBootstrapPath)
    },

    async getEntryCssIds(componentPath: string): Promise<string[]> {
      const cssIds = await collectDevEntryCssIds(
        devServer,
        getServerEnvironment(devServer),
        componentPath,
      )
      return cssIds.map(applyServeBase)
    },
  }
}

function basePathForDev(base: string): string {
  const baseUrl = new URL(base, 'https://example.com')
  return baseUrl.pathname.replace(/\/$/, '')
}
