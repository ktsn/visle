import path from 'node:path'
import { Plugin, ResolvedConfig } from 'vite'
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
import { ResolvedVisleConfig } from '../config.js'

export function islandCorePlugin(config: ResolvedVisleConfig): Plugin {
  let manifest: ReturnType<typeof clientManifest>
  let viteConfig: ResolvedConfig

  return {
    name: 'vue-island-core',

    configResolved(resolvedConfig) {
      viteConfig = resolvedConfig
      manifest = clientManifest({
        manifest: '.vite/manifest.json',
        command: resolvedConfig.command,
        isProduction: resolvedConfig.isProduction,
        root: resolvedConfig.root,
        base: resolvedConfig.base,
        clientOutDir: config.clientOutDir,
      })
    },

    resolveId(id) {
      // Access environment name via this.environment
      const isServer = this.environment?.name === 'server'

      if (!isServer) {
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

    load(id) {
      // Access environment name via this.environment
      const isServer = this.environment?.name === 'server'

      if (!isServer) {
        if (id === clientVirtualEntryId) {
          return generateClientVirtualEntryCode(
            resolveServerComponentIds(
              path.join(viteConfig.root, config.componentDir),
            ),
          )
        }

        if (id === virtualCustomElementEntryPath) {
          return readFile(customElementEntryPath, 'utf-8')
        }

        return null
      }

      if (id === serverVirtualEntryId) {
        return generateServerVirtualEntryCode(
          viteConfig.root,
          config.componentDir,
          resolveServerComponentIds(
            path.join(viteConfig.root, config.componentDir),
          ),
        )
      }

      if (id === symbolImportId) {
        return symbolCode
      }
    },

    transform(code, id) {
      // Access environment name via this.environment
      const isServer = this.environment?.name === 'server'

      if (!isServer) {
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
