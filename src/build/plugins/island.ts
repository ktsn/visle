import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { Plugin, ResolvedConfig } from 'vite'

import { clientManifest } from '../client-manifest.js'
import { ResolvedVisleConfig } from '../config.js'
import {
  generateIslandWrapperCode,
  generateServerComponentCode,
  generateClientVirtualEntryCode,
  generateServerVirtualEntryCode,
  clientVirtualEntryId,
  serverVirtualEntryId,
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
 * handles `?island` virtual modules for island wrapper code generation,
 * and collects CSS/JS manifest data during bundle generation.
 */
interface IslandPluginResult {
  plugin: Plugin
  getManifest(): ReturnType<typeof clientManifest>
}

export function islandPlugin(config: ResolvedVisleConfig): IslandPluginResult {
  let manifest: ReturnType<typeof clientManifest>
  let viteConfig: ResolvedConfig

  const plugin: Plugin = {
    name: 'visle:island',

    sharedDuringBuild: true,

    configResolved(resolvedConfig) {
      viteConfig = resolvedConfig
      manifest = clientManifest(resolvedConfig)
    },

    resolveId(id) {
      const envName = this.environment?.name

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

        const { query } = parseId(id)

        if (query.island) {
          return id
        }

        if (query.original) {
          return id
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

        const { fileName, query } = parseId(id)

        if (query.island && fileName.endsWith('.vue')) {
          const componentRelativePath = path.relative(viteConfig.root, fileName)
          const customElementEntryRelativePath = path.relative(
            viteConfig.root,
            customElementEntryPath,
          )
          return generateIslandWrapperCode(componentRelativePath, customElementEntryRelativePath)
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

      // Skip ?island virtual modules
      if (query.island) {
        return null
      }

      // All .vue files get server component wrapping with runtime manifest CSS
      const componentRelativePath = path.relative(viteConfig.root, fileName)
      return generateServerComponentCode(fileName, componentRelativePath)
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
