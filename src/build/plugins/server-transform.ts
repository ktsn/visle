import path from 'node:path'

import type { DirectiveNode, ElementNode, TemplateChildNode } from '@vue/compiler-core'
import { NodeTypes } from '@vue/compiler-core'
import MagicString from 'magic-string'
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

function toAbsolutePath(fileName: string, importer: string | undefined): string {
  if (path.isAbsolute(fileName)) {
    return fileName
  }
  if (importer) {
    const importerFileName = parseId(importer).fileName
    return path.resolve(path.dirname(importerFileName), fileName)
  }
  return path.resolve(fileName)
}

/**
 * Vite plugin that transforms Vue SFC imports on the server environment.
 * - Redirects `.vue` imports to server component wrapper virtual modules
 * - Loads server/island wrapper virtual modules with generated code
 * - Rewrites SFC templates containing `v-client:load` directives
 *   to replace components with island wrappers
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

    resolveId(id, importer) {
      // Redirect .vue imports to server wrapper virtual modules.
      // Skip when the importer is a wrapper module to avoid infinite recursion.
      const { fileName, query } = parseId(id)

      if (fileName.endsWith('.vue') && !query.vue) {
        const isFromWrapper =
          importer?.startsWith(serverWrapPrefix) || importer?.startsWith(islandWrapPrefix)
        if (!isFromWrapper) {
          const absolutePath = toAbsolutePath(fileName, importer)

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

    transform(code, id) {
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

      const s = new MagicString(code)

      for (const node of matches) {
        const tag = node.tag

        // Check if this is a statically imported component
        const importInfo = importMap.get(tag)
        if (!importInfo) {
          this.warn(
            `v-client:load on "${tag}" is not supported. ` +
              'Only statically imported Vue components are supported.',
          )
          continue
        }

        // Resolve the absolute path of the component and collect for islands build
        const resolvedPath = path.resolve(path.dirname(fileName), importInfo.source)
        islandPaths.add(resolvedPath)

        // Record in the island import map so resolveId can redirect this import
        // to the island wrapper virtual module
        let set = islandImportMap.get(fileName)
        if (!set) {
          set = new Set()
          islandImportMap.set(fileName, set)
        }
        set.add(resolvedPath)

        // Remove v-client:load directive from the element
        removeVClientDirective(s, node)
      }

      return {
        code: s.toString(),
        map: s.generateMap({ hires: true }),
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

/**
 * Removes the v-client directive from an element's template source.
 */
function removeVClientDirective(s: MagicString, node: ElementNode): void {
  const directive = node.props.find(
    (prop): prop is DirectiveNode => prop.type === NodeTypes.DIRECTIVE && prop.name === 'client',
  )

  if (!directive) {
    return
  }

  let start = directive.loc.start.offset
  const end = directive.loc.end.offset

  // Remove one preceding space
  if (start > 0 && s.original[start - 1] === ' ') {
    start--
  }

  s.remove(start, end)
}
