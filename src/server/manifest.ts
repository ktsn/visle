import fs from 'node:fs/promises'

import { manifestFileName, type ManifestData } from '../core/manifest.js'
import { type AbsolutePath, join } from '../core/path.js'

export interface RuntimeManifest {
  getClientImportId(componentRelativePath: string): Promise<string>
  getEntryCssIds(componentPath: string): Promise<string[]>
  getIslandsBootstrapId(): Promise<string>
}

/**
 * Loads the manifest file from serverOutDir for production SSR.
 */
export async function loadManifest(serverOutDir: AbsolutePath): Promise<RuntimeManifest> {
  const manifestPath = join(serverOutDir, manifestFileName)

  const data: ManifestData = JSON.parse(await fs.readFile(manifestPath, 'utf-8'))
  const basePath = data.base.replace(/\/$/, '')

  return {
    async getClientImportId(componentRelativePath: string): Promise<string> {
      const file = data.jsMap[componentRelativePath]
      if (!file) {
        throw new Error(`${componentRelativePath} not found in manifest JS map`)
      }
      return `${basePath}/${file}`
    },

    async getEntryCssIds(componentPath: string): Promise<string[]> {
      const entryRelativePath = `${data.entryDir}/${componentPath}.vue`
      const cssIds = data.cssMap[entryRelativePath] ?? []
      return cssIds.map((cssId) => `${basePath}/${cssId}`)
    },

    async getIslandsBootstrapId(): Promise<string> {
      return `${basePath}/${data.islandsBootstrap}`
    },
  }
}
