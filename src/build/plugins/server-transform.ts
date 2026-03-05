import path from 'node:path'

import type { Plugin, ResolvedConfig } from 'vite'
import { parse } from 'vue/compiler-sfc'

import { generateComponentWrapperCode, componentWrapPrefix } from '../generate.js'
import { customElementEntryPath, parseId } from '../paths.js'
import { buildImportMap, findVClientElements } from '../sfc-analysis.js'

interface ServerTransformPluginResult {
  plugin: Plugin
  islandPaths: Set<string>
}

/**
 * Vite plugin that transforms Vue SFC imports on the server environment.
 * - Redirects `.vue` imports to component wrapper virtual modules
 * - Loads wrapper virtual modules with generated code
 * - Detects `v-client:load` directives and collects island component paths for the islands build
 */
export function serverTransformPlugin(): ServerTransformPluginResult {
  const islandPaths = new Set<string>()

  let viteConfig: ResolvedConfig

  const plugin: Plugin = {
    name: 'visle:server-transform',
    enforce: 'pre',
    sharedDuringBuild: true,

    applyToEnvironment(environment) {
      return environment.name === 'server'
    },

    configResolved(resolvedConfig) {
      viteConfig = resolvedConfig
    },

    buildStart() {
      islandPaths.clear()
    },

    async resolveId(id, importer) {
      // Redirect .vue imports to wrapper virtual modules.
      // Skip when the importer is a wrapper module to avoid infinite recursion.
      const { fileName, query } = parseId(id)

      if (fileName.endsWith('.vue') && !query.vue) {
        const isFromWrapper = importer?.startsWith(componentWrapPrefix)
        if (!isFromWrapper) {
          const resolved = await this.resolve(id, importer, { skipSelf: true })
          if (!resolved) {
            return null
          }

          return componentWrapPrefix + resolved.id
        }
      }
    },

    load(id) {
      // Handle virtual JS modules for component wrapping.
      // These use non-.vue IDs to prevent the Vue plugin from processing them
      // and corrupting its shared descriptor cache.
      if (id.startsWith(componentWrapPrefix)) {
        const filePath = id.slice(componentWrapPrefix.length)
        const componentRelativePath = path.relative(viteConfig.root, filePath)
        const customElementEntryRelativePath = path.relative(
          viteConfig.root,
          customElementEntryPath,
        )
        return generateComponentWrapperCode(
          filePath,
          componentRelativePath,
          customElementEntryRelativePath,
        )
      }
    },

    async transform(code, id) {
      const { fileName, query } = parseId(id)

      if (!fileName.endsWith('.vue')) {
        return null
      }

      // Skip sub-requests (e.g., ?vue&type=style) — only process plain .vue files
      if (query.vue) {
        return null
      }

      const { descriptor } = parse(code)

      if (!descriptor.template?.ast) {
        return null
      }

      // Build tag-name-to-import-source map from <script setup>
      const importMap = buildImportMap(descriptor, id)

      // Find elements with v-client:load
      const matches = findVClientElements(descriptor.template.ast.children)

      if (matches.length === 0) {
        return null
      }

      // Resolve alias import sources in parallel
      const resolveResults = await Promise.all(
        matches.map(async (node) => {
          const importInfo = importMap.get(node.tag)
          if (!importInfo) {
            return {
              tag: node.tag,
              importInfo: undefined,
              resolvedPath: undefined,
            }
          }

          const source = importInfo.source
          let resolvedPath: string | undefined

          // Note: skipSelf only works when this.resolve is called from resolveId.
          // From transform, our resolveId still runs and wraps the result with a
          // virtual module prefix, so we need to unwrap it.
          const resolved = await this.resolve(source, id)
          if (resolved) {
            const resolvedId = resolved.id
            if (resolvedId.startsWith(componentWrapPrefix)) {
              resolvedPath = resolvedId.slice(componentWrapPrefix.length)
            } else {
              resolvedPath = resolvedId
            }
          }

          return {
            tag: node.tag,
            importInfo,
            resolvedPath,
          }
        }),
      )

      for (const { tag, importInfo, resolvedPath } of resolveResults) {
        if (!importInfo) {
          this.warn(
            `v-client:load on "${tag}" is not supported. ` +
              'Only statically imported Vue components are supported.',
          )
          continue
        }

        if (!resolvedPath) {
          this.warn(
            `Could not resolve import "${importInfo.source}" for v-client:load component "${tag}" in ${fileName}`,
          )
          continue
        }

        islandPaths.add(resolvedPath)
      }
    },
  }

  return { plugin, islandPaths }
}
