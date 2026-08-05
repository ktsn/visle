import type { Plugin, ViteDevServer } from 'vite'

import { collectDevEntryCssIds } from '../../dev/style.js'
import type { ResolvedVisleConfig } from '../../shared/config.js'
import { virtualIslandsBootstrapPath } from '../../shared/entry.js'
import type { BuildManifest } from '../../shared/manifest.js'
import { type AbsolutePath, asAbs, relative, resolve } from '../../shared/path.js'
import {
  generateIntegratedDevManifestCode,
  generateIntegratedManifestCode,
  generateServerVirtualEntryCode,
  resolvedViteEntriesId,
  resolvedViteEntryCssPrefix,
  resolvedViteManifestId,
  resolvedServerEntriesId,
  serverEntriesId,
  viteEntriesId,
  viteEntryCssPrefix,
  viteManifestId,
} from '../generate.js'
import { islandsBootstrapPath, resolveServerComponentIds, stripEntryExt } from '../paths.js'

/**
 * Vite plugin that resolves and loads virtual entry modules per environment.
 */
export function virtualFilePlugin(
  config: ResolvedVisleConfig,
  getBuildManifest: () => BuildManifest,
): Plugin {
  let command: 'build' | 'serve'
  let entryRoot: AbsolutePath
  let root: AbsolutePath
  let base: string
  let devServer: ViteDevServer | undefined

  function componentIds(): AbsolutePath[] {
    return resolveServerComponentIds(entryRoot, config.entryExt)
  }

  return {
    name: 'visle:virtual-file',
    enforce: 'pre',
    sharedDuringBuild: true,

    configResolved(resolvedConfig) {
      command = resolvedConfig.command
      root = asAbs(resolvedConfig.root)
      entryRoot = resolve(root, config.entryDir)
      base = resolvedConfig.base
    },

    configureServer(server) {
      devServer = server
    },

    resolveId(id) {
      if (id === virtualIslandsBootstrapPath) {
        return islandsBootstrapPath
      }

      if (id === serverEntriesId) {
        return resolvedServerEntriesId
      }

      if (config.serverBuild === 'integrated' && this.environment.config.consumer === 'server') {
        if (id === viteEntriesId) {
          return resolvedViteEntriesId
        }

        if (id === viteManifestId) {
          return resolvedViteManifestId
        }

        if (command === 'serve' && id.startsWith(viteEntryCssPrefix)) {
          return resolvedViteEntryCssPrefix + id.slice(viteEntryCssPrefix.length)
        }
      }

      return null
    },

    async load(id) {
      if (id === resolvedServerEntriesId || id === resolvedViteEntriesId) {
        return generateServerVirtualEntryCode(
          entryRoot,
          componentIds(),
          config.entryExt,
          id === resolvedViteEntriesId,
        )
      }

      if (id === resolvedViteManifestId) {
        if (command === 'build') {
          return generateIntegratedManifestCode(getBuildManifest())
        }

        const entries = Object.fromEntries(
          componentIds().map((componentId) => [
            relative(root, componentId),
            stripEntryExt(relative(entryRoot, componentId), config.entryExt),
          ]),
        )
        return generateIntegratedDevManifestCode(base, config.entryDir, config.entryExt, entries)
      }

      if (id.startsWith(resolvedViteEntryCssPrefix)) {
        if (!devServer) {
          this.error('[visle] Development CSS resolution requires a running Vite dev server.')
        }
        const server = devServer

        const serverEnvironment = server.environments[this.environment.name]
        if (!serverEnvironment) {
          this.error('[visle] No server environment is available for development CSS resolution.')
        }

        const componentPath = decodeURIComponent(id.slice(resolvedViteEntryCssPrefix.length))
        const componentId = componentIds().find(
          (candidate) =>
            stripEntryExt(relative(entryRoot, candidate), config.entryExt) === componentPath,
        )
        if (componentId) {
          this.addWatchFile(componentId)
        }

        const cssUrls = await collectDevEntryCssIds(server, serverEnvironment, componentPath, {
          onModule: (module) => {
            if (module.file) {
              this.addWatchFile(module.file)
            }
          },
        })
        return `export default ${JSON.stringify(cssUrls)}\n`
      }

      return null
    },
  }
}
