import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { Plugin, ResolvedConfig } from 'vite'

import { clientManifest } from '../client-manifest.js'
import { ResolvedVisleConfig } from '../config.js'
import {
  generateIslandWrapperCodeJS,
  generateServerComponentCodeJS,
  generateClientVirtualEntryCode,
  generateServerVirtualEntryCode,
  clientVirtualEntryId,
  serverVirtualEntryId,
  serverWrapPrefix,
  islandWrapId,
  islandWrapPrefix,
} from '../generate.js'
import {
  customElementEntryPath,
  virtualCustomElementEntryPath,
  parseId,
  resolveServerComponentIds,
} from '../paths.js'

/**
 * Core Vite plugin for the islands architecture.
 * Resolves and loads virtual entry modules per environment (style, islands, server),
 * transforms `.vue` files on the server to inject CSS asset references,
 * handles island wrapper virtual modules for island wrapper code generation,
 * and collects CSS/JS manifest data during bundle generation.
 */
interface IslandPluginResult {
  plugin: Plugin
  getManifest(): ReturnType<typeof clientManifest>
}

function toAbsolutePath(fileName: string, importer: string | undefined): string {
  if (path.isAbsolute(fileName)) {
    return fileName
  }
  if (importer) {
    const importerFileName = parseId(importer).fileName
    return path.resolve(path.dirname(importerFileName), fileName)
  }
  return path.resolve(fileName)
}

export function islandPlugin(config: ResolvedVisleConfig): IslandPluginResult {
  let manifest: ReturnType<typeof clientManifest>
  let viteConfig: ResolvedConfig

  const plugin: Plugin = {
    name: 'visle:island',

    enforce: 'pre',

    sharedDuringBuild: true,

    configResolved(resolvedConfig) {
      viteConfig = resolvedConfig
      manifest = clientManifest(resolvedConfig)
    },

    resolveId(id, importer) {
      const envName = this.environment?.name

      // Resolve island wrapper virtual module imports (from v-client plugin)
      if (id.startsWith(islandWrapId)) {
        return '\0' + id
      }

      if (envName === 'style') {
        if (id === clientVirtualEntryId) {
          return clientVirtualEntryId
        }
        return
      }

      if (envName === 'islands') {
        if (id === virtualCustomElementEntryPath) {
          return virtualCustomElementEntryPath
        }
        return
      }

      if (envName === 'server') {
        if (id === serverVirtualEntryId) {
          return serverVirtualEntryId
        }

        const { fileName, query } = parseId(id)

        // Redirect .vue imports to server wrapper virtual modules.
        // Skip when the importer is a wrapper module to avoid infinite recursion.
        if (fileName.endsWith('.vue') && !query.vue) {
          const isFromWrapper =
            importer?.startsWith(serverWrapPrefix) || importer?.startsWith(islandWrapPrefix)
          if (!isFromWrapper) {
            const absolutePath = toAbsolutePath(fileName, importer)
            return serverWrapPrefix + absolutePath
          }
        }

        return
      }

      // Dev client environment — resolve both virtual entries
      if (id === virtualCustomElementEntryPath) {
        return virtualCustomElementEntryPath
      }

      if (id === clientVirtualEntryId) {
        return clientVirtualEntryId
      }
    },

    load(id) {
      const envName = this.environment?.name

      // Handle virtual JS modules for server wrapping.
      // These use non-.vue IDs to prevent the Vue plugin from processing them
      // and corrupting its shared descriptor cache.
      if (id.startsWith(serverWrapPrefix)) {
        const filePath = id.slice(serverWrapPrefix.length)
        const componentRelativePath = path.relative(viteConfig.root, filePath)
        return generateServerComponentCodeJS(filePath, componentRelativePath)
      }

      if (id.startsWith(islandWrapPrefix)) {
        const filePath = id.slice(islandWrapPrefix.length)
        const componentRelativePath = path.relative(viteConfig.root, filePath)
        const customElementEntryRelativePath = path.relative(
          viteConfig.root,
          customElementEntryPath,
        )
        return generateIslandWrapperCodeJS(
          filePath,
          componentRelativePath,
          customElementEntryRelativePath,
        )
      }

      if (envName === 'style') {
        if (id === clientVirtualEntryId) {
          return generateClientVirtualEntryCode(
            resolveServerComponentIds(path.join(viteConfig.root, config.componentDir)),
          )
        }
        return null
      }

      if (envName === 'islands') {
        if (id === virtualCustomElementEntryPath) {
          return readFile(customElementEntryPath, 'utf-8')
        }
        return null
      }

      if (envName === 'server') {
        if (id === serverVirtualEntryId) {
          return generateServerVirtualEntryCode(
            path.join(viteConfig.root, config.componentDir),
            resolveServerComponentIds(path.join(viteConfig.root, config.componentDir)),
          )
        }

        return null
      }

      // Dev client environment — load both virtual entries
      if (id === clientVirtualEntryId) {
        return generateClientVirtualEntryCode(
          resolveServerComponentIds(path.join(viteConfig.root, config.componentDir)),
        )
      }

      if (id === virtualCustomElementEntryPath) {
        return readFile(customElementEntryPath, 'utf-8')
      }

      return null
    },

    generateBundle(_options, bundle) {
      const envName = this.environment?.name
      const root = viteConfig.root

      if (envName === 'style') {
        const cssMap = new Map<string, string[]>()
        let entryCss: string[] = []

        for (const [key, chunk] of Object.entries(bundle)) {
          if (chunk.type !== 'chunk') {
            continue
          }

          if (chunk.facadeModuleId === clientVirtualEntryId) {
            entryCss = Array.from(chunk.viteMetadata?.importedCss ?? [])
            delete bundle[key]
            continue
          }

          if (chunk.facadeModuleId) {
            const relativePath = path.relative(root, chunk.facadeModuleId)
            cssMap.set(relativePath, Array.from(chunk.viteMetadata?.importedCss ?? []))
          }
        }

        manifest.setStyleBuildData({ cssMap, entryCss })
        return
      }

      if (envName === 'islands') {
        const jsMap = new Map<string, string>()

        for (const [key, chunk] of Object.entries(bundle)) {
          // Since we generate all style files in style environment,
          // delete all css assets in islands environment
          if (
            chunk.type === 'asset' &&
            typeof chunk.fileName === 'string' &&
            chunk.fileName.endsWith('.css')
          ) {
            delete bundle[key]
            continue
          }

          if (chunk.type !== 'chunk') {
            continue
          }

          if (chunk.facadeModuleId) {
            const relativePath = path.relative(root, chunk.facadeModuleId)
            jsMap.set(relativePath, chunk.fileName)
          }
        }

        manifest.setIslandsBuildData({ jsMap })
      }
    },
  }

  return {
    plugin,
    getManifest() {
      return manifest
    },
  }
}
