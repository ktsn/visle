import type { Plugin } from 'vite'

import fs from 'node:fs'
import path from 'node:path'

import { VisleConfig, defaultConfig, setVisleConfig } from './config.js'
import { clientVirtualEntryId, serverVirtualEntryId } from './generate.js'
import { customElementEntryPath, resolvePattern } from './paths.js'
import { islandPlugin } from './plugins/index.js'

export type { VisleConfig }

/**
 * Visle plugin for Vite.
 * Configures client and server environments for islands architecture.
 */
export function visle(config: VisleConfig = {}): Plugin[] {
  const resolvedConfig = {
    ...defaultConfig,
    ...config,
  }

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
              emptyOutDir: false,
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
              emptyOutDir: false,
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
            if (userConfig.build?.emptyOutDir) {
              // We have to manually clean shared clientOutDir once before parallel build
              // since style and islands build output to the same directory
              const clientOutDir = path.resolve(root, resolvedConfig.clientOutDir)
              await fs.promises.rm(clientOutDir, { recursive: true, force: true })
            }

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
