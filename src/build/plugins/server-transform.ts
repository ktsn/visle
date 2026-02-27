import path from 'node:path'

import type { ElementNode, TemplateChildNode } from '@vue/compiler-core'
import { NodeTypes } from '@vue/compiler-core'
import type { Plugin, ResolvedConfig } from 'vite'
import { compileScript, parse, type SFCDescriptor } from 'vue/compiler-sfc'

import {
  generateIslandWrapperCodeJS,
  generateServerComponentCodeJS,
  islandWrapPrefix,
  serverWrapPrefix,
} from '../generate.js'
import { customElementEntryPath, parseId } from '../paths.js'

interface ServerTransformPluginResult {
  plugin: Plugin
  islandPaths: Set<string>
}

interface ImportInfo {
  source: string
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
   * Map from importer file path → set of absolute component paths
   * that should be resolved as island wrappers.
   * Populated by the transform hook, consumed by resolveId.
   */
  const islandImportMap = new Map<string, Set<string>>()

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
          if (importerPath && islandImportMap.get(importerPath)?.has(absolutePath)) {
            return islandWrapPrefix + absolutePath
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
        return generateServerComponentCodeJS(filePath, componentRelativePath)
      }

      if (id.startsWith(islandWrapPrefix)) {
        const filePath = id.slice(islandWrapPrefix.length)
        const componentRelativePath = path.relative(viteConfig.root, filePath)
        const customElementEntryRelativePath = path.relative(
          viteConfig.root,
          customElementEntryPath,
        )
        return generateIslandWrapperCodeJS(
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
            if (resolvedId.startsWith(serverWrapPrefix)) {
              resolvedPath = resolvedId.slice(serverWrapPrefix.length)
            } else if (resolvedId.startsWith(islandWrapPrefix)) {
              resolvedPath = resolvedId.slice(islandWrapPrefix.length)
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

        if (!resolvedPath) continue

        islandPaths.add(resolvedPath)

        // Record in the island import map so resolveId can redirect this import
        // to the island wrapper virtual module
        let set = islandImportMap.get(fileName)
        if (!set) {
          set = new Set()
          islandImportMap.set(fileName, set)
        }
        set.add(resolvedPath)
      }
    },
  }

  return { plugin, islandPaths }
}

/**
 * Parses import declarations from <script setup> using compileScript
 * to build a tag-name-to-import mapping.
 */
function buildImportMap(descriptor: SFCDescriptor, id: string): Map<string, ImportInfo> {
  const map = new Map<string, ImportInfo>()

  if (!descriptor.scriptSetup) {
    return map
  }

  const { imports } = compileScript(descriptor, { id })

  if (!imports) {
    return map
  }

  for (const [name, binding] of Object.entries(imports)) {
    if (binding.source.endsWith('.vue')) {
      map.set(name, {
        source: binding.source,
      })
    }
  }

  return map
}

/**
 * Recursively finds elements with v-client:load directive.
 */
function findVClientElements(children: TemplateChildNode[]): ElementNode[] {
  const results: ElementNode[] = []

  for (const child of children) {
    if (child.type !== NodeTypes.ELEMENT) {
      continue
    }

    const hasVClient = child.props.some(
      (prop) =>
        prop.type === NodeTypes.DIRECTIVE &&
        prop.name === 'client' &&
        prop.arg?.type === NodeTypes.SIMPLE_EXPRESSION &&
        prop.arg.content === 'load',
    )

    if (hasVClient) {
      results.push(child)
    }

    if (child.children.length > 0) {
      results.push(...findVClientElements(child.children))
    }
  }

  return results
}
