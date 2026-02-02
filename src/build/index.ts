import type { Plugin } from 'vite'

import path from 'node:path'

import { VisleConfig, resolveVisleConfig, setVisleConfig } from './config.js'
import { clientVirtualEntryId, serverVirtualEntryId } from './generate.js'
import { customElementEntryPath, resolvePattern } from './paths.js'
import { islandPlugin } from './plugins/index.js'

export type { VisleConfig }

/**
 * Visle plugin for Vite.
 * Configures client and server environments for islands architecture.
 */
export function visle(config: VisleConfig = {}): Plugin[] {
  const resolvedConfig = resolveVisleConfig(config)

  const vislePlugin: Plugin = {
    name: 'visle',

    config(userConfig) {
      // Get root from user config or default to cwd
      const root = path.resolve(userConfig.root ?? process.cwd())

      // Find island components for client entry points
      const islandPaths = resolvePattern(
        '/**/*.island.vue',
        path.join(root, resolvedConfig.componentDir),
      )

      return {
        environments: {
          style: {
            consumer: 'client',
            build: {
              outDir: resolvedConfig.clientOutDir,
              rollupOptions: {
                input: [clientVirtualEntryId],
                preserveEntrySignatures: 'allow-extension',
              },
            },
          },
          islands: {
            consumer: 'client',
            build: {
              outDir: resolvedConfig.clientOutDir,
              rollupOptions: {
                input: [customElementEntryPath, ...islandPaths],
                preserveEntrySignatures: 'allow-extension',
              },
            },
          },
          server: {
            consumer: 'server',
            build: {
              outDir: resolvedConfig.serverOutDir,
              rollupOptions: {
                input: [serverVirtualEntryId],
              },
            },
          },
        },

        builder: {
          buildApp: async (builder) => {
            // Build style and islands in parallel to generate manifest data
            await Promise.all([
              builder.build(builder.environments.style!),
              builder.build(builder.environments.islands!),
            ])
            // Then build server with manifest info
            await builder.build(builder.environments.server!)
          },
        },
      }
    },

    configResolved(viteConfig) {
      setVisleConfig(viteConfig, resolvedConfig)
    },
  }

  // Return visle plugin along with island plugins
  return [vislePlugin, ...islandPlugin(resolvedConfig)]
}
