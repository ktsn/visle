import type { ManifestSource, SourceValue } from '../shared/manifest.js'

export interface RuntimeManifest {
  getClientImportId(componentRelativePath: string): Promise<string>
  getEntryCssIds(componentPath: string): Promise<string[]>
  getIslandsBootstrapId(): Promise<string>
}

function resolveSourceValue(source: SourceValue<string>): Promise<string>
function resolveSourceValue(source: SourceValue<string[]>): Promise<string[]>
async function resolveSourceValue(
  source: SourceValue<string | string[]>,
): Promise<string | string[]> {
  return typeof source === 'function' ? source() : source
}

/**
 * Creates the platform-neutral runtime view of build manifest data.
 */
export function createRuntimeManifest(source: ManifestSource): RuntimeManifest {
  const basePath = source.base.replace(/\/$/, '')

  function resolveAssetId(id: string): string {
    return `${basePath}/${id.replace(/^\//, '')}`
  }

  return {
    async getClientImportId(componentRelativePath: string): Promise<string> {
      const fileSource = source.jsMap[componentRelativePath]
      const file = fileSource && (await resolveSourceValue(fileSource))
      if (!file) {
        throw new Error(`${componentRelativePath} not found in manifest JS map`)
      }
      return resolveAssetId(file)
    },

    async getEntryCssIds(componentPath: string): Promise<string[]> {
      const cssIdsSource = (source.entryExt ?? ['.vue'])
        .map((ext) => source.cssMap[`${source.entryDir}/${componentPath}${ext}`])
        .find((value) => value !== undefined)
      if (cssIdsSource === undefined) {
        return []
      }

      const cssIds = await resolveSourceValue(cssIdsSource)
      return cssIds.map(resolveAssetId)
    },

    async getIslandsBootstrapId(): Promise<string> {
      return resolveAssetId(source.islandsBootstrap)
    },
  }
}
