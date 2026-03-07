import path from 'node:path'

import { Plugin, ResolvedConfig } from 'vite'

export const manifestFileName = 'visle-manifest.json'

export interface ManifestData {
  cssMap: Record<string, string[]>
  jsMap: Record<string, string>
}

interface ManifestPluginResult {
  plugin: Plugin
  getManifestData(): ManifestData
}

/**
 * Vite plugin that collects CSS/JS manifest data during bundle generation.
 */
export function manifestPlugin(): ManifestPluginResult {
  let viteConfig: ResolvedConfig
  let cssMap: Map<string, string[]> | undefined
  let jsMap: Map<string, string> | undefined

  const plugin: Plugin = {
    name: 'visle:manifest',
    apply: 'build',
    sharedDuringBuild: true,

    configResolved(resolvedConfig) {
      viteConfig = resolvedConfig
    },

    generateBundle(_options, bundle) {
      const envName = this.environment?.name
      const root = viteConfig.root

      if (envName === 'style') {
        const envCssMap = new Map<string, string[]>()

        // Pre-build maps for transitive CSS collection before modifying bundle
        const chunkImportsMap = new Map<string, string[]>()
        const chunkCssMap = new Map<string, Set<string>>()
        for (const chunk of Object.values(bundle)) {
          if (chunk.type === 'chunk') {
            chunkImportsMap.set(chunk.fileName, [
              ...chunk.imports,
              ...chunk.dynamicImports,
            ])
            chunkCssMap.set(chunk.fileName, chunk.viteMetadata?.importedCss ?? new Set())
          }
        }

        /**
         * Collect CSS transitively through chunk imports.
         * Recursively traverse static and dynamic dependencies, writing
         * visited state and result in the sets passed through arguments.
         * The values are shared and mutated during recursive calls.
         */
        function collectCss(
          fileName: string,
          visited = new Set<string>(),
          result = new Set<string>(),
        ): Set<string> {
          if (visited.has(fileName)) {
            return result
          }
          visited.add(fileName)

          for (const imported of chunkImportsMap.get(fileName) ?? []) {
            collectCss(imported, visited, result)
          }
          for (const cssFile of chunkCssMap.get(fileName) ?? []) {
            result.add(cssFile)
          }

          return result
        }

        for (const [key, chunk] of Object.entries(bundle)) {
          if (chunk.type !== 'chunk') {
            continue
          }

          if (chunk.fileName.endsWith('.js')) {
            delete bundle[key]
          }

          for (const moduleId of chunk.moduleIds) {
            if (this.getModuleInfo(moduleId)?.isEntry) {
              const relativePath = path.relative(root, moduleId)
              const collected = collectCss(chunk.fileName)
              envCssMap.set(relativePath, Array.from(collected))
            }
          }
        }

        cssMap = envCssMap
        return
      }

      if (envName === 'islands') {
        const envJsMap = new Map<string, string>()

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

          // Map entry modules paths to output chunk path.
          // Using moduleIds rather than facadeModuleId because it can be disappeared.
          // (e.g., barrel files merged with their re-export targets by Rollup)
          for (const moduleId of chunk.moduleIds) {
            if (this.getModuleInfo(moduleId)?.isEntry) {
              const moduleRelativePath = path.relative(root, moduleId)
              envJsMap.set(moduleRelativePath, chunk.fileName)
            }
          }
        }

        jsMap = envJsMap
      }
    },
  }

  return {
    plugin,

    getManifestData(): ManifestData {
      return {
        cssMap: Object.fromEntries(cssMap ?? new Map()),
        jsMap: Object.fromEntries(jsMap ?? new Map()),
      }
    },
  }
}
