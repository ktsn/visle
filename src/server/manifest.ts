import type { ManifestData } from '../shared/manifest.js'

export interface RuntimeManifest {
  getClientImportId(componentRelativePath: string): Promise<string>
  getEntryCssIds(componentPath: string): Promise<string[]>
  getIslandsBootstrapId(): Promise<string>
}

/**
 * Creates the platform-neutral runtime view of build manifest data.
 */
export function createRuntimeManifest(data: ManifestData): RuntimeManifest {
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
      const entryExt = data.entryExt ?? ['.vue']
      for (const ext of entryExt) {
        const entryRelativePath = `${data.entryDir}/${componentPath}${ext}`
        const cssIds = data.cssMap[entryRelativePath]
        if (cssIds) {
          return cssIds.map((cssId) => `${basePath}/${cssId}`)
        }
      }
      return []
    },

    async getIslandsBootstrapId(): Promise<string> {
      return `${basePath}/${data.islandsBootstrap}`
    },
  }
}
