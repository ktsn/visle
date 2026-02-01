import path from 'node:path'
import { Manifest, Plugin, ResolvedConfig } from 'vite'
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

    sharedDuringBuild: true,

    configResolved(resolvedConfig) {
      viteConfig = resolvedConfig
      manifest = clientManifest(resolvedConfig)
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
          path.join(viteConfig.root, config.componentDir),
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
      if (this.environment?.name !== 'client') {
        return
      }

      const root = viteConfig.root
      const viteManifest: Manifest = {}
      let entryMetadata: EntryMetadata = { css: [] }

      for (const [key, chunk] of Object.entries(bundle)) {
        if (chunk.type !== 'chunk') {
          continue
        }

        if (chunk.facadeModuleId === clientVirtualEntryId) {
          entryMetadata = {
            css: Array.from(chunk.viteMetadata?.importedCss ?? []),
          }
          delete bundle[key]
          continue
        }

        if (chunk.facadeModuleId) {
          const relativePath = path.relative(root, chunk.facadeModuleId)
          viteManifest[relativePath] = {
            file: chunk.fileName,
            css: Array.from(chunk.viteMetadata?.importedCss ?? []),
          }
        }
      }

      manifest.setBuildData({
        manifest: viteManifest,
        entryMetadata,
      })
    },
  }
}
