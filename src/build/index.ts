import fs from 'node:fs/promises'
import path from 'node:path'

import type { BuildEnvironment, EnvironmentOptions, Plugin } from 'vite'

import { type VisleConfig, defaultConfig, setVisleConfig } from '../shared/config.js'
import { manifestFileName } from '../shared/manifest.js'
import { asAbs, join, resolve } from '../shared/path.js'
import {
  bundleDeclarationFileName,
  bundleFileName,
  generateBundleCode,
  generateBundleDeclarationCode,
  serverEntriesId,
  serverEntryFileName,
} from './generate.js'
import { islandsBootstrapPath, resolveServerComponentIds } from './paths.js'
import { devStyleSSRPlugin } from './plugins/dev-style-ssr.js'
import { entryTypesPlugin } from './plugins/entry-types.js'
import { islandComponentsPlugin } from './plugins/island-components.js'
import { manifestPlugin } from './plugins/manifest.js'
import { serverTransformPlugin } from './plugins/server-transform.js'
import { virtualFilePlugin } from './plugins/virtual-file.js'
import { wrapVuePlugin } from './vue.js'

export type { VisleConfig }

/**
 * Visle plugin for Vite.
 * Configures style, client, and server build environments,
 * orchestrates the build order, and sets up Vue SFC compilation
 * with island component support.
 */
export function visle(config: VisleConfig = {}): Plugin[] {
  const resolvedConfig = {
    ...defaultConfig,
    ...config,
  }

  const { plugin: islandComponents, islandPaths } = islandComponentsPlugin(resolvedConfig.entryExt)
  const { plugin: manifest, getBuildManifest } = manifestPlugin(resolvedConfig)
  const { plugin: entryTypes, generate: generateEntryTypes } = entryTypesPlugin(resolvedConfig)
  const serverTransform = serverTransformPlugin(resolvedConfig.entryExt)
  const virtualFile = virtualFilePlugin(resolvedConfig, getBuildManifest)
  const vuePlugin = wrapVuePlugin(resolvedConfig)

  const orchestrationPlugin: Plugin = {
    name: 'visle:orchestration',

    config(userConfig) {
      // Get root from user config or default to cwd
      const root = asAbs(path.resolve(userConfig.root ?? process.cwd()))
      const entryDir = resolve(root, resolvedConfig.entryDir)

      const environments: Record<string, EnvironmentOptions> = {
        style: {
          consumer: 'client',
          build: {
            outDir: resolvedConfig.clientOutDir,
            rollupOptions: {
              input: [...resolveServerComponentIds(entryDir, resolvedConfig.entryExt)],
              preserveEntrySignatures: 'allow-extension',
            },
          },
        },
        client: {
          consumer: 'client',
          build: {
            outDir: resolvedConfig.clientOutDir,
            emptyOutDir: false,
            rollupOptions: {
              // Start with islands bootstrap;
              // v-client island paths are added after the style build
              input: [islandsBootstrapPath],
              preserveEntrySignatures: 'allow-extension',
            },
          },
        },
        ssr: {
          consumer: 'server',
          resolve: {
            // The package export imports Visle virtual modules and must be
            // processed as part of the integrated server bundle.
            noExternal: ['visle'],
          },
          build: {
            outDir: resolvedConfig.serverOutDir,
            ...(resolvedConfig.serverBuild === 'components'
              ? {
                  rollupOptions: {
                    input: [serverEntriesId],
                    output: {
                      entryFileNames: serverEntryFileName,
                    },
                  },
                }
              : {}),
          },
        },
      }

      return {
        environments,

        builder: {
          buildApp: async (builder) => {
            async function buildEnvironment(
              name: string,
              env: BuildEnvironment | undefined,
            ): Promise<void> {
              if (!env) {
                throw new Error(`[visle] The ${name} environment is not configured.`)
              }

              if (!env.isBuilt) {
                await builder.build(env)
              }
            }

            // The style traversal discovers every island component before the
            // client environment consumes those paths as build inputs.
            await buildEnvironment('style', builder.environments.style)
            await buildEnvironment('client', builder.environments.client)
            await buildEnvironment('ssr', builder.environments.ssr)

            await generateEntryTypes()

            if (resolvedConfig.serverBuild === 'components') {
              // Components mode emits files consumed by an external server build.
              const serverOutDir = resolve(root, resolvedConfig.serverOutDir)
              await fs.mkdir(serverOutDir, { recursive: true })

              await Promise.all([
                fs.writeFile(
                  join(serverOutDir, manifestFileName),
                  JSON.stringify(getBuildManifest(), null, 2),
                ),
                fs.writeFile(join(serverOutDir, bundleFileName), generateBundleCode()),
                fs.writeFile(
                  join(serverOutDir, bundleDeclarationFileName),
                  generateBundleDeclarationCode(),
                ),
              ])
            }
          },
        },
      }
    },

    configResolved(viteConfig) {
      setVisleConfig(viteConfig, resolvedConfig)
    },
  }

  const clientInputPlugin: Plugin = {
    name: 'visle:client-input',
    sharedDuringBuild: true,

    applyToEnvironment: (env) => env.name === 'client',

    options(opts) {
      if (islandPaths.size === 0) {
        return null
      }

      if (!Array.isArray(opts.input) && typeof opts.input !== 'string') {
        this.error(
          'It is not allowed to pass an object value to the input option of the client environment',
        )
      }

      // Update client environment input with paths discovered during style build
      const existing = Array.isArray(opts.input) ? opts.input : [opts.input]

      return { ...opts, input: [...existing, ...islandPaths] }
    },
  }

  return [
    orchestrationPlugin,
    clientInputPlugin,
    islandComponents,
    serverTransform,
    virtualFile,
    manifest,
    entryTypes,
    vuePlugin,
    devStyleSSRPlugin(),
  ]
}
