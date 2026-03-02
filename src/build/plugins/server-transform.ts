import path from 'node:path'

import type { Plugin, ResolvedConfig } from 'vite'
import { parse } from 'vue/compiler-sfc'

import {
  buildIslandWrapId,
  generateIslandWrapperCode,
  generateServerComponentCode,
  type IslandStrategy,
  islandWrapPrefix,
  parseIslandWrapId,
  serverWrapPrefix,
} from '../generate.js'
import { customElementEntryPath, parseId } from '../paths.js'
import { buildImportMap, findVClientElements } from '../sfc-analysis.js'

interface ServerTransformPluginResult {
  plugin: Plugin
  islandPaths: Set<string>
}

/**
 * Vite plugin that transforms Vue SFC imports on the server environment.
 * - Redirects `.vue` imports to server component wrapper virtual modules
 * - Loads server/island wrapper virtual modules with generated code
 * - Detects `v-client:load` directives and redirects imports to island wrappers
 * - Collects island component paths for the islands build
 */
export function serverTransformPlugin(): ServerTransformPluginResult {
  const islandPaths = new Set<string>()

  /**
   * Map from importer file path → (absolute component path → strategy).
   * Populated by the transform hook, consumed by resolveId.
   */
  const islandImportMap = new Map<string, Map<string, IslandStrategy>>()

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
      islandImportMap.clear()
    },

    async resolveId(id, importer) {
      // Redirect .vue imports to server wrapper virtual modules.
      // Skip when the importer is a wrapper module to avoid infinite recursion.
      const { fileName, query } = parseId(id)

      if (fileName.endsWith('.vue') && !query.vue) {
        const isFromWrapper =
          importer?.startsWith(serverWrapPrefix) || importer?.startsWith(islandWrapPrefix)
        if (!isFromWrapper) {
          const resolved = await this.resolve(id, importer, { skipSelf: true })
          if (!resolved) {
            return null
          }

          const absolutePath = resolved.id

          // Check if this import was marked as an island by the transform hook.
          // The importer may include a query (e.g. ?vue&type=script), so strip it.
          const importerPath = importer ? parseId(importer).fileName : undefined
          const strategy = importerPath
            ? islandImportMap.get(importerPath)?.get(absolutePath)
            : undefined
          if (strategy) {
            return buildIslandWrapId(strategy, absolutePath)
          }

          return serverWrapPrefix + absolutePath
        }
      }
    },

    load(id) {
      // Handle virtual JS modules for server wrapping.
      // These use non-.vue IDs to prevent the Vue plugin from processing them
      // and corrupting its shared descriptor cache.
      if (id.startsWith(serverWrapPrefix)) {
        const filePath = id.slice(serverWrapPrefix.length)
        const componentRelativePath = path.relative(viteConfig.root, filePath)
        return generateServerComponentCode(filePath, componentRelativePath)
      }

      const islandWrap = parseIslandWrapId(id)
      if (islandWrap) {
        const { filePath, strategy } = islandWrap
        const componentRelativePath = path.relative(viteConfig.root, filePath)
        const customElementEntryRelativePath = path.relative(
          viteConfig.root,
          customElementEntryPath,
        )
        return generateIslandWrapperCode(
          filePath,
          componentRelativePath,
          customElementEntryRelativePath,
          strategy,
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

      // Find elements with v-client directives
      const matches = findVClientElements(descriptor.template.ast.children)

      if (matches.length === 0) {
        return null
      }

      // Resolve alias import sources in parallel
      const resolveResults = await Promise.all(
        matches.map(async ({ element: node, strategy }) => {
          const importInfo = importMap.get(node.tag)
          if (!importInfo) {
            return {
              tag: node.tag,
              strategy,
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
            if (resolvedId.startsWith(serverWrapPrefix)) {
              resolvedPath = resolvedId.slice(serverWrapPrefix.length)
            } else {
              const islandWrap = parseIslandWrapId(resolvedId)
              if (islandWrap) {
                resolvedPath = islandWrap.filePath
              } else {
                resolvedPath = resolvedId
              }
            }
          }

          return {
            tag: node.tag,
            strategy,
            importInfo,
            resolvedPath,
          }
        }),
      )

      for (const { tag, strategy, importInfo, resolvedPath } of resolveResults) {
        if (!importInfo) {
          this.warn(
            `v-client:${strategy} on "${tag}" is not supported. ` +
              'Only statically imported Vue components are supported.',
          )
          continue
        }

        if (!resolvedPath) {
          this.warn(
            `Could not resolve import "${importInfo.source}" for v-client:${strategy} component "${tag}" in ${fileName}`,
          )
          continue
        }

        islandPaths.add(resolvedPath)

        // Record in the island import map so resolveId can redirect this import
        // to the island wrapper virtual module
        let map = islandImportMap.get(fileName)
        if (!map) {
          map = new Map()
          islandImportMap.set(fileName, map)
        }
        map.set(resolvedPath, strategy)
      }
    },
  }

  return { plugin, islandPaths }
}
