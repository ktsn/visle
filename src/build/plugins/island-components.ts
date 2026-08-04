import type { Plugin } from 'vite'

import { hasEntryExt, parseId } from '../paths.js'
import { extractIslandComponents } from '../sfc-analysis.js'

interface IslandComponentsPluginResult {
  plugin: Plugin
  islandPaths: Set<string>
}

/**
 * Collects island component paths while the style environment traverses every
 * server entry and its dependencies.
 */
export function islandComponentsPlugin(entryExt: string[]): IslandComponentsPluginResult {
  const islandPaths = new Set<string>()

  const plugin: Plugin = {
    name: 'visle:island-components',
    enforce: 'pre',
    sharedDuringBuild: true,

    applyToEnvironment(environment) {
      return environment.name === 'style'
    },

    buildStart() {
      islandPaths.clear()
    },

    async transform(code, id) {
      const { fileName, query } = parseId(id)

      if (!hasEntryExt(fileName, entryExt) || query.vue) {
        return null
      }

      const islands = await extractIslandComponents(id, code, async (source, importer) => {
        return (await this.resolve(source, importer))?.id ?? null
      })

      for (const { resolvedPath } of islands) {
        if (resolvedPath) {
          islandPaths.add(resolvedPath)
        }
      }

      return null
    },
  }

  return { plugin, islandPaths }
}
