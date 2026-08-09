import type { DevEnvironment, Environment, Plugin, ViteDevServer } from 'vite'

import { collectDevEntryCssIds } from '../../dev/style.js'
import type { ResolvedVisleConfig } from '../../shared/config.js'
import { islandsBootstrapPath } from '../../shared/entry.js'
import type { BuildManifest } from '../../shared/manifest.js'
import { type AbsolutePath, asAbs, relative, resolve } from '../../shared/path.js'
import {
  generateVirtualDevManifestCode,
  generateVirtualManifestCode,
  generateServerVirtualEntryCode,
  serverEntriesId,
  viteEntriesId,
  viteEntryCssPrefix,
  viteManifestId,
} from '../generate.js'
import { realIslandsBootstrapPath, resolveServerComponentIds, stripEntryExt } from '../paths.js'

/**
 * Vite plugin that resolves and loads virtual entry modules per environment.
 */
export function virtualFilePlugins(
  config: ResolvedVisleConfig,
  getBuildManifest: () => BuildManifest,
): Plugin[] {
  function entryDir(env: Environment): AbsolutePath {
    const root = asAbs(env.config.root)
    return resolve(root, config.entryDir)
  }

  function componentIds(env: Environment): AbsolutePath[] {
    return resolveServerComponentIds(entryDir(env), config.entryExt)
  }

  return [
    vfsRedirectPlugin({
      name: 'islands-bootstrap',
      from: islandsBootstrapPath,
      to: realIslandsBootstrapPath,
    }),

    vfsLoadPlugin({
      name: 'server-entries',
      filter: (id) => id === serverEntriesId,
      load() {
        return generateServerVirtualEntryCode(
          entryDir(this.environment),
          componentIds(this.environment),
          config.entryExt,
          false,
        )
      },
    }),

    vfsLoadPlugin({
      name: 'vite-entries',
      filter: (id) => id === viteEntriesId,
      load() {
        return generateServerVirtualEntryCode(
          entryDir(this.environment),
          componentIds(this.environment),
          config.entryExt,
          true,
        )
      },
    }),

    vfsLoadPlugin({
      name: 'vite-manifest',
      filter: (id) => id === viteManifestId,
      load() {
        if (this.environment.config.command === 'build') {
          return generateVirtualManifestCode(getBuildManifest())
        }

        return generateVirtualDevManifestCode(
          {
            root: asAbs(this.environment.config.root),
            base: this.environment.config.base,
            entryDir: config.entryDir,
            entryExt: config.entryExt,
          },
          componentIds(this.environment),
        )
      },
    }),

    vfsLoadPlugin({
      name: 'entry-css',

      filter(id) {
        return this.environment.config.command === 'serve' && id.startsWith(viteEntryCssPrefix)
      },

      async load(id) {
        const componentPath = decodeURIComponent(id.slice(viteEntryCssPrefix.length))
        const componentId = componentIds(this.environment).find(
          (candidate) =>
            stripEntryExt(relative(entryDir(this.environment), candidate), config.entryExt) ===
            componentPath,
        )
        if (componentId) {
          this.addWatchFile(componentId)
        }

        const cssUrls = await collectDevEntryCssIds(
          this.server,
          this.serverEnvironment,
          componentPath,
          {
            onModule: (module) => {
              if (module.file) {
                this.addWatchFile(module.file)
              }
            },
          },
        )
        return `export default ${JSON.stringify(cssUrls)}\n`
      },
    }),
  ]
}

interface PluginContext {
  environment: Environment
  server: ViteDevServer
  serverEnvironment: DevEnvironment
  error: (message: string) => never
  addWatchFile: (id: string) => void
}

function vfsLoadPlugin({
  name,
  filter,
  load,
}: {
  name: string
  filter: (this: PluginContext, id: string) => boolean
  load: (this: PluginContext, id: string) => string | Promise<string>
}): Plugin {
  type VitePluginContext = Plugin['resolveId'] extends infer F
    ? F extends (this: infer R, ...args: infer _Args) => infer _Return
      ? R
      : never
    : never

  function ctxOf(viteCtx: VitePluginContext): PluginContext {
    return {
      get environment() {
        return viteCtx.environment
      },

      get server(): ViteDevServer {
        if (!devServer) {
          viteCtx.error(`[visle] ${name} resolution requires a running Vite dev server.`)
        }

        return devServer
      },

      get serverEnvironment(): DevEnvironment {
        const serverEnvironment = this.server.environments[this.environment.name]
        if (!serverEnvironment) {
          viteCtx.error(`[visle] No server environment is available for ${name} resolution.`)
        }

        return serverEnvironment
      },

      error: (message) => viteCtx.error(message),
      addWatchFile: (id) => viteCtx.addWatchFile(id),
    }
  }

  let devServer: ViteDevServer | undefined

  return {
    name: `visle:virtual:${name}`,
    enforce: 'pre',
    sharedDuringBuild: true,

    configureServer(server) {
      devServer = server
    },

    resolveId(id) {
      if (filter.call(ctxOf(this), id)) {
        return `\0${id}`
      }

      return null
    },

    async load(id) {
      if (id.charAt(0) === '\0' && filter.call(ctxOf(this), id.slice(1))) {
        return load.call(ctxOf(this), id.slice(1))
      }

      return null
    },
  }
}

function vfsRedirectPlugin({ name, from, to }: { name: string; from: string; to: string }): Plugin {
  return {
    name: `visle:virtual:${name}`,
    enforce: 'pre',
    sharedDuringBuild: true,

    resolveId(id) {
      if (id === from) {
        return to
      }

      return null
    },
  }
}
