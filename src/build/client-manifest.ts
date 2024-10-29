import { Manifest } from 'vite'
import path from 'node:path'
import baseFs from 'node:fs'

export const virtualCustomElementEntryPath = '/@entry-custom-element'

export const customElementEntryPath = path.resolve(
  import.meta.dirname,
  '../client/custom-element.js',
)

interface ClientManifestConfig {
  manifest: string
  command: 'serve' | 'build'
  root: string
  clientDist: string
  fs?: ClientManifestFs
}

interface ClientManifestFs {
  readFileSync: typeof baseFs.readFileSync
}

export function clientManifest(config: ClientManifestConfig) {
  const fs = config.fs || baseFs

  let clientManifest: Manifest

  function ensureClientManifest(): Manifest {
    if (clientManifest) {
      return clientManifest
    }

    clientManifest = JSON.parse(
      fs.readFileSync(
        path.resolve(config.root, config.clientDist, config.manifest),
        'utf-8',
      ),
    )
    return clientManifest
  }

  function getClientImportId(id: string): string {
    const relativePath = path.relative(config.root, id)

    if (config.command === 'serve') {
      if (id === customElementEntryPath) {
        return virtualCustomElementEntryPath
      }
      return `/${relativePath}`
    }

    const manifest = ensureClientManifest()
    const file = manifest[relativePath]?.file
    if (!file) {
      throw new Error(`${relativePath} not found in manifest`)
    }

    return `/${file}`
  }

  function getDependingClientCssIds(id: string): string[] {
    if (config.command === 'serve') {
      return []
    }

    const relativePath = path.relative(config.root, id)
    const manifest = ensureClientManifest()

    const cssIds = manifest[relativePath]?.css || []
    return cssIds.map((cssId) => `/${cssId}`)
  }

  return {
    getClientImportId,
    getDependingClientCssIds,
  }
}
