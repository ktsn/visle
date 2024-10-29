import { Plugin } from 'vite'
import path from 'node:path'
import fs from 'node:fs'
import { globSync } from 'glob'
import {
  generateIslandCode,
  islandSymbolCode,
  islandSymbolImportId,
} from './generate.js'
import {
  clientManifest,
  customElementEntryPath,
  virtualCustomElementEntryPath,
} from './client-manifest.js'

export interface IslandPluginOptions {
  clientDist: string
  serverDist: string
}

export function island(options: IslandPluginOptions): Plugin {
  let manifest: ReturnType<typeof clientManifest>

  const { clientDist, serverDist } = options

  return {
    name: 'vue-island',

    config(config) {
      if (config.build?.ssr) {
        return {
          build: {
            outDir: serverDist,
          },
        }
      }

      const islandDirectory = path.resolve(config.root ?? './')
      const islandPaths = globSync(`${islandDirectory}/**/*.island.vue`)

      return {
        build: {
          manifest: true,
          outDir: clientDist,
          rollupOptions: {
            input: [customElementEntryPath, ...islandPaths],
            preserveEntrySignatures: 'allow-extension',
          },
        },
      }
    },

    configResolved(config) {
      manifest = clientManifest({
        manifest: '.vite/manifest.json',
        clientDist,
        command: config.command,
        root: config.root,
      })
    },

    async resolveId(id, _importer, options) {
      if (!options?.ssr) {
        if (id === virtualCustomElementEntryPath) {
          return customElementEntryPath
        }
        return
      }

      if (id === islandSymbolImportId) {
        return islandSymbolImportId
      }

      const { query } = parseId(id)

      if (query.original) {
        return id
      }
    },

    async load(id, options) {
      if (!options?.ssr) {
        return null
      }

      if (id === islandSymbolImportId) {
        return islandSymbolCode
      }

      const { fileName, query } = parseId(id)

      if (!fileName.endsWith('.island.vue')) {
        return null
      }

      // Vue plugin generated code
      if (query.vue) {
        return null
      }

      if (query.original) {
        return fs.readFileSync(fileName, 'utf-8')
      }

      const clientImportId = manifest.getClientImportId(fileName)
      const entryImportId = manifest.getClientImportId(customElementEntryPath)
      const cssIds = manifest.getDependingClientCssIds(fileName)
      return generateIslandCode(fileName, clientImportId, entryImportId, cssIds)
    },
  }
}

interface ParsedIdQuery {
  original?: boolean
  vue?: boolean
}

function parseId(id: string): {
  fileName: string
  query: ParsedIdQuery
} {
  const [fileName, searchParams] = id.split('?')
  const parsed = new URLSearchParams(searchParams)

  const query: ParsedIdQuery = {}
  if (parsed.has('original')) {
    query.original = true
  }
  if (parsed.has('vue')) {
    query.vue = true
  }

  return {
    fileName: fileName!,
    query,
  }
}
