import fs from 'node:fs/promises'
import path from 'node:path'

import vue from '@vitejs/plugin-vue'
import type { Plugin } from 'vite'

import { generateComponentId } from './component-id.js'
import { VisleConfig, defaultConfig, setVisleConfig } from './config.js'
import { clientVirtualEntryId, islandElementName, serverVirtualEntryId } from './generate.js'
import { customElementEntryPath } from './paths.js'
import { devStyleSSRPlugin } from './plugins/dev-style-ssr.js'
import { manifestFileName, manifestPlugin } from './plugins/manifest.js'
import { serverTransformPlugin } from './plugins/server-transform.js'
import { virtualFilePlugin } from './plugins/virtual-file.js'

export type { VisleConfig }

/**
 * Visle plugin for Vite.
 * Configures style, islands, and server build environments,
 * orchestrates the build order, and sets up Vue SFC compilation
 * with island component support.
 */
export function visle(config: VisleConfig = {}): Plugin[] {
  const resolvedConfig = {
    ...defaultConfig,
    ...config,
  }

  const { plugin: serverTransform, islandPaths } = serverTransformPlugin()
  const virtualFile = virtualFilePlugin(resolvedConfig)
  const { plugin: manifest, getManifestData } = manifestPlugin()

  const orchestrationPlugin: Plugin = {
    name: 'visle:orchestration',

    config(userConfig) {
      // Get root from user config or default to cwd
      const root = path.resolve(userConfig.root ?? process.cwd())

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
              emptyOutDir: false,
              rollupOptions: {
                // Start with only custom element entry;
                // island component paths are added after server build
                input: [customElementEntryPath],
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
            // Build style and server in parallel
            // - Style build produces cssMap (component -> CSS file mappings)
            // - Server build discovers island component paths via server-transform rewriting
            await Promise.all([
              builder.build(builder.environments.style!),
              builder.build(builder.environments.server!),
            ])

            // Update islands environment input with paths discovered during server build
            const islandsEnv = builder.environments.islands!
            const currentInput = (islandsEnv.config.build.rollupOptions?.input as string[]) ?? [
              customElementEntryPath,
            ]
            islandsEnv.config.build.rollupOptions ??= {}
            islandsEnv.config.build.rollupOptions.input = [...currentInput, ...islandPaths]

            // Build islands using entry paths collected during server build
            await builder.build(islandsEnv)

            // Write manifest file after all builds
            const serverOutDir = path.resolve(root, resolvedConfig.serverOutDir)
            await fs.mkdir(serverOutDir, { recursive: true })
            await fs.writeFile(
              path.join(serverOutDir, manifestFileName),
              JSON.stringify(getManifestData()),
            )
          },
        },
      }
    },

    configResolved(viteConfig) {
      setVisleConfig(viteConfig, resolvedConfig)
    },
  }

  return [
    orchestrationPlugin,
    serverTransform,
    virtualFile,
    manifest,
    vue({
      features: {
        componentIdGenerator: (filePath, source, isProduction) => {
          return generateComponentId(filePath, source, isProduction ?? false)
        },
      },
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag === islandElementName,
        },
      },
    }),
    devStyleSSRPlugin(),
  ]
}
