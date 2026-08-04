import type { Plugin, ResolvedConfig } from 'vite'

import { asAbs, relative } from '../../shared/path.js'
import { generateComponentWrapperCode, componentWrapPrefix } from '../generate.js'
import { hasEntryExt, parseId } from '../paths.js'
import { extractIslandComponents } from '../sfc-analysis.js'

/**
 * Vite plugin that transforms Vue SFC imports on the server environment.
 * - Redirects island component imports to component wrapper virtual modules
 * - Loads wrapper virtual modules with generated code
 * - Detects `v-client:*` directives and records imports that need wrapping
 */
export function serverTransformPlugin(entryExt: string[]): Plugin {
  /**
   * Map from importer file path → Map<resolvedSourcePath, Set<importedName>>
   * Tracks which imports need wrapping.
   * Populated by the transform hook, consumed by resolveId.
   */
  const componentNameMap = new Map<string, Map<string, Set<string>>>()

  let viteConfig: ResolvedConfig

  return {
    name: 'visle:server-transform',
    enforce: 'pre',
    sharedDuringBuild: true,

    applyToEnvironment(environment) {
      return environment.config.consumer === 'server'
    },

    configResolved(resolvedConfig) {
      viteConfig = resolvedConfig
    },

    buildStart() {
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

      // Skip SFC sub-requests (e.g. ?vue&type=script)
      if (hasEntryExt(fileName, entryExt) && query.vue) {
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

      return null
    },

    async transform(code, id) {
      const { fileName, query } = parseId(id)

      if (!hasEntryExt(fileName, entryExt)) {
        return null
      }

      // Skip sub-requests (e.g., ?vue&type=style) — only process plain SFC files
      if (query.vue) {
        return null
      }

      const islands = extractIslandComponents(id, code, async (source, importer) => {
        // Note: skipSelf only works when this.resolve is called from resolveId.
        // From transform, our resolveId still runs and wraps the result with a
        // virtual module prefix, so we need to unwrap it.
        return (await this.resolve(source, importer))?.id ?? null
      })

      for (const { tag, importInfo, resolvedPath } of await islands) {
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

      return null
    },
  }
}
