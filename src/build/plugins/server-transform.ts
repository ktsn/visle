import type { Plugin, ResolvedConfig } from 'vite'
import { parse } from 'vue/compiler-sfc'

import { asAbs, relative } from '../../shared/path.js'
import { generateComponentWrapperCode, componentWrapPrefix } from '../generate.js'
import { parseId } from '../paths.js'
import { buildImportMap, findVClientElements } from '../sfc-analysis.js'

interface ServerTransformPluginResult {
  plugin: Plugin
  islandPaths: Set<string>
}

/**
 * Vite plugin that transforms Vue SFC imports on the server environment.
 * - Redirects island component imports to component wrapper virtual modules
 * - Loads wrapper virtual modules with generated code
 * - Detects `v-client:load` directives and collects island component paths for the islands build
 */
export function serverTransformPlugin(): ServerTransformPluginResult {
  const islandPaths = new Set<string>()

  /**
   * Map from importer file path → Map<resolvedSourcePath, Set<importedName>>
   * Tracks which imports need wrapping.
   * Populated by the transform hook, consumed by resolveId.
   */
  const componentNameMap = new Map<string, Map<string, Set<string>>>()

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
      componentNameMap.clear()
    },

    async resolveId(id, importer) {
      // Redirect imports to wrapper virtual modules.
      // Skip when the importer is a wrapper module to avoid infinite recursion.
      const parsedImporter = importer ? parseId(importer) : undefined
      if (parsedImporter?.prefix === componentWrapPrefix) {
        return null
      }

      const { fileName, query } = parseId(id)

      // Skip .vue sub-requests (e.g. ?vue&type=script)
      if (fileName.endsWith('.vue') && query.vue) {
        return null
      }

      const resolved = await this.resolve(id, importer, { skipSelf: true })
      if (!resolved) {
        return null
      }

      const importerPath = parsedImporter?.fileName
      const nameMap = importerPath ? componentNameMap.get(importerPath) : undefined
      const names = nameMap?.get(resolved.id)

      if (!names || names.size === 0) {
        return null
      }

      const namesQuery = `?names=${[...names].join(',')}`
      return componentWrapPrefix + resolved.id + namesQuery
    },

    load(id) {
      // Handle virtual JS modules for component wrapping.
      // These use non-.vue IDs to prevent the Vue plugin from processing them
      // and corrupting its shared descriptor cache.
      const { prefix, fileName, query } = parseId(id)

      if (prefix === componentWrapPrefix) {
        const root = asAbs(viteConfig.root)
        const absFileName = asAbs(fileName)
        const componentRelativePath = relative(root, absFileName)
        const importedNames = query.names ?? []

        return generateComponentWrapperCode(absFileName, componentRelativePath, importedNames)
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

      // Build tag-name-to-import-source map from <script> block
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

          // Note: skipSelf only works when this.resolve is called from resolveId.
          // From transform, our resolveId still runs and wraps the result with a
          // virtual module prefix, so we need to unwrap it.
          const resolved = await this.resolve(importInfo.source, id)
          const resolvedPath = resolved ? parseId(resolved.id).fileName : undefined

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

        // Record import name so resolveId can include it in the names query
        let nameMap = componentNameMap.get(fileName)
        if (!nameMap) {
          nameMap = new Map()
          componentNameMap.set(fileName, nameMap)
        }
        let names = nameMap.get(resolvedPath)
        if (!names) {
          names = new Set()
          nameMap.set(resolvedPath, names)
        }
        names.add(importInfo.importedName)
      }
    },
  }

  return { plugin, islandPaths }
}
