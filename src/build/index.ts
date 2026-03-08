import fs from 'node:fs/promises'
import path from 'node:path'

import vue from '@vitejs/plugin-vue'
import { createObjectProperty, createSimpleExpression } from '@vue/compiler-core'
import type { Plugin } from 'vite'

import { asAbs, join, resolve } from '../core/path.js'
import { generateComponentId } from './component-id.js'
import { VisleConfig, defaultConfig, setVisleConfig } from './config.js'
import { serverVirtualEntryId } from './generate.js'
import { islandsBootstrapPath, resolveServerComponentIds } from './paths.js'
import { devStyleSSRPlugin } from './plugins/dev-style-ssr.js'
import { entryTypesPlugin } from './plugins/entry-types.js'
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
  const { plugin: manifest, getManifestData } = manifestPlugin(resolvedConfig)
  const { plugin: entryTypes, generate: generateEntryTypes } = entryTypesPlugin(resolvedConfig)

  const orchestrationPlugin: Plugin = {
    name: 'visle:orchestration',

    config(userConfig) {
      // Get root from user config or default to cwd
      const root = asAbs(path.resolve(userConfig.root ?? process.cwd()))
      const entryDir = resolve(root, resolvedConfig.entryDir)

      return {
        environments: {
          style: {
            consumer: 'client',
            build: {
              outDir: resolvedConfig.clientOutDir,
              rollupOptions: {
                input: [...resolveServerComponentIds(entryDir)],
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
                // Start with islands bootstrap;
                // v-client island paths are added after server build
                input: [islandsBootstrapPath],
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

            // Build islands using entry paths collected during server build
            await builder.build(builder.environments.islands!)

            // Write manifest and type definition files after all builds
            const serverOutDir = resolve(root, resolvedConfig.serverOutDir)
            await fs.mkdir(serverOutDir, { recursive: true })

            await Promise.all([
              fs.writeFile(
                join(serverOutDir, manifestFileName),
                JSON.stringify(getManifestData(), null, 2),
              ),
              generateEntryTypes(),
            ])
          },
        },
      }
    },

    configResolved(viteConfig) {
      setVisleConfig(viteConfig, resolvedConfig)
    },
  }

  const islandsInputPlugin: Plugin = {
    name: 'visle:islands-input',
    sharedDuringBuild: true,

    applyToEnvironment: (env) => env.name === 'islands',

    options(opts) {
      if (islandPaths.size === 0) {
        return
      }

      // Update islands environment input with paths discovered during server build
      const existing = Array.isArray(opts.input)
        ? opts.input
        : opts.input
          ? [opts.input as string]
          : []

      return { ...opts, input: [...existing, ...islandPaths] }
    },
  }

  return [
    orchestrationPlugin,
    islandsInputPlugin,
    serverTransform,
    virtualFile,
    manifest,
    entryTypes,
    vue({
      features: {
        componentIdGenerator: (filePath, source, isProduction) => {
          return generateComponentId(filePath, source, isProduction ?? false)
        },
      },
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag === 'vue-island',
          directiveTransforms: {
            // server-transform plugin searches v-client directive to detect
            // island component. Strip v-client directive here to make sure to
            // remove it in all environment.
            client: () => ({
              props: [
                createObjectProperty(
                  createSimpleExpression('__visle_client__', true),
                  createSimpleExpression('true', false),
                ),
              ],
            }),
          },
        },
      },
    }),
    devStyleSSRPlugin(),
  ]
}
