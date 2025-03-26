import { Plugin } from 'vite'
import { readFile } from 'node:fs/promises'
import {
  generateIslandCode,
  generateServerComponentCode,
  generateClientVirtualEntryCode,
  generateServerVirtualEntryCode,
  symbolCode,
  symbolImportId,
  clientVirtualEntryId,
  serverVirtualEntryId,
} from '../generate.js'
import {
  customElementEntryPath,
  entryMetadataPath,
  virtualCustomElementEntryPath,
  parseId,
  resolveServerComponentIds,
} from '../paths.js'
import { clientManifest, EntryMetadata } from '../client-manifest.js'
import { ResolvedIslandsConfig } from '../config.js'

export function islandCorePlugin(config: ResolvedIslandsConfig): Plugin {
  let manifest: ReturnType<typeof clientManifest>

  return {
    name: 'vue-island-core',

    configResolved(viteConfig) {
      manifest = clientManifest(config, {
        manifest: '.vite/manifest.json',
        command: viteConfig.command,
        isProduction: viteConfig.isProduction,
      })
    },

    resolveId(id, _importer, options) {
      if (!options?.ssr) {
        if (id === virtualCustomElementEntryPath) {
          return virtualCustomElementEntryPath
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
            resolveServerComponentIds(config),
          )
        }

        if (id === virtualCustomElementEntryPath) {
          return readFile(customElementEntryPath, 'utf-8')
        }

        return null
      }

      if (id === serverVirtualEntryId) {
        return generateServerVirtualEntryCode(
          config,
          resolveServerComponentIds(config),
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
