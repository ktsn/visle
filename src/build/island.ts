import { Plugin } from 'vite'
import path from 'node:path'
import { globSync } from 'glob'
import {
  generateIslandCode,
  generateServerComponentCode,
  generateClientVirtualEntryCode,
  generateServerVirtualEntryCode,
  symbolCode,
  symbolImportId,
  clientVirtualEntryId,
  serverVirtualEntryId,
} from './generate.js'
import {
  clientManifest,
  customElementEntryPath,
  EntryMetadata,
  entryMetadataPath,
  virtualCustomElementEntryPath,
} from './client-manifest.js'

export interface IslandPluginOptions {
  clientDist: string
  componentDir: string
}

export function island(options: IslandPluginOptions): Plugin {
  let manifest: ReturnType<typeof clientManifest>
  let root: string

  const { clientDist, componentDir } = options

  return {
    name: 'vue-island',

    configResolved(config) {
      root = config.root
      manifest = clientManifest({
        manifest: '.vite/manifest.json',
        clientDist,
        command: config.command,
        root: config.root,
        isProduction: config.isProduction,
      })
    },

    resolveId(id, _importer, options) {
      if (!options?.ssr) {
        if (id === virtualCustomElementEntryPath) {
          return customElementEntryPath
        }

        if (id === clientVirtualEntryId) {
          return clientVirtualEntryId
        }

        return
      }

      if (id === serverVirtualEntryId) {
        return serverVirtualEntryId
      }

      if (id === symbolImportId) {
        return symbolImportId
      }

      const { query } = parseId(id)

      if (query.original) {
        return id
      }
    },

    load(id, options) {
      if (!options?.ssr) {
        if (id === clientVirtualEntryId) {
          return generateClientVirtualEntryCode(
            resolveServerComponentIds(root, componentDir),
          )
        }
        return null
      }

      if (id === serverVirtualEntryId) {
        return generateServerVirtualEntryCode(
          { root, componentDir },
          resolveServerComponentIds(root, componentDir),
        )
      }

      if (id === symbolImportId) {
        return symbolCode
      }
    },

    transform(code, id, options) {
      if (!options?.ssr) {
        return null
      }

      const { fileName, query } = parseId(id)

      if (!fileName.endsWith('.vue')) {
        return null
      }

      // Vue plugin generated code
      if (query.vue) {
        return null
      }

      if (query.original) {
        return code
      }

      if (fileName.endsWith('.island.vue')) {
        const clientImportId = manifest.getClientImportId(fileName)
        const entryImportId = manifest.getClientImportId(customElementEntryPath)
        const cssIds = manifest.getDependingClientCssIds(fileName, code)
        return generateIslandCode(
          fileName,
          clientImportId,
          entryImportId,
          cssIds,
        )
      }

      // .vue file
      const cssIds = manifest.getDependingClientCssIds(fileName, code)
      return generateServerComponentCode(fileName, cssIds)
    },

    generateBundle(_options, bundle) {
      for (const [key, chunk] of Object.entries(bundle)) {
        if (
          chunk.type === 'chunk' &&
          chunk.facadeModuleId === clientVirtualEntryId
        ) {
          delete bundle[key]

          const entryMetaData: EntryMetadata = {
            css: Array.from(chunk.viteMetadata?.importedCss ?? []),
          }

          this.emitFile({
            type: 'asset',
            fileName: entryMetadataPath,
            source: JSON.stringify(entryMetaData),
          })
        }
      }
    },
  }
}

interface ParsedIdQuery {
  original?: boolean
  vue?: boolean
}

function parseId(id: string): {
  fileName: string
  query: ParsedIdQuery
} {
  const [fileName, searchParams] = id.split('?')
  const parsed = new URLSearchParams(searchParams)

  const query: ParsedIdQuery = {}
  if (parsed.has('original')) {
    query.original = true
  }
  if (parsed.has('vue')) {
    query.vue = true
  }

  return {
    fileName: fileName!,
    query,
  }
}

function resolveServerComponentIds(
  root: string,
  componentDir: string,
): string[] {
  const basePath = path.join(root, componentDir)

  const islandPaths = new Set(resolvePattern('/**/*.island.vue', basePath))
  const vuePaths = resolvePattern('/**/*.vue', basePath)

  return vuePaths.filter((p) => !islandPaths.has(p))
}

function resolvePattern(pattern: string | string[], root: string): string[] {
  if (typeof pattern === 'string') {
    return globSync(path.join(root, pattern))
  }

  return pattern.flatMap((p) => resolvePattern(p, root))
}
