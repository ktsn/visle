import { Plugin, ResolvedConfig, Manifest } from 'vite'
import path from 'node:path'
import fs from 'node:fs'
import { cwd } from 'node:process'
import { globSync } from 'glob'
import { generateIslandCode } from './generate.js'

export interface IslandPluginOptions {
  clientDist: string
  serverDist: string
  islandDirectory: string
}

const virtualCustomElementEntryPath = '/@entry-custom-element'

const customElementPath = path.resolve(
  import.meta.dirname,
  '../client/custom-element.js',
)

export function island(options: IslandPluginOptions): Plugin {
  let config: ResolvedConfig

  const { clientDist, serverDist } = options

  let clientManifest: Manifest

  function ensureClientManifest(): Manifest {
    if (clientManifest) {
      return clientManifest
    }

    clientManifest = JSON.parse(
      fs.readFileSync(path.resolve(clientDist, '.vite/manifest.json'), 'utf-8'),
    )
    return clientManifest
  }

  function getClientImportId(id: string): string {
    const relativePath = path.relative(config.root, id)

    if (config.command === 'serve') {
      if (id === customElementPath) {
        return virtualCustomElementEntryPath
      }
      return `/${relativePath}`
    }

    const manifest = ensureClientManifest()
    return `/${manifest[relativePath]!.file}`
  }

  function getClientCssIds(id: string): string[] {
    if (config.command !== 'build') {
      return []
    }

    const relativePath = path.relative(config.root, id)
    const manifest = ensureClientManifest()

    const cssIds = manifest[relativePath]?.css || []
    return cssIds.map((cssId) => `/${cssId}`)
  }

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

      const islandDirectory = path.resolve(
        config.root ?? cwd(),
        options.islandDirectory,
      )
      const islandPaths = globSync(`${islandDirectory}/**/*.client.vue`)

      return {
        build: {
          manifest: true,
          outDir: clientDist,
          rollupOptions: {
            input: [customElementPath, ...islandPaths],
            preserveEntrySignatures: 'allow-extension',
          },
        },
      }
    },

    configResolved(resolved) {
      config = resolved
    },

    async resolveId(id, _importer, options) {
      if (!options?.ssr) {
        if (id === virtualCustomElementEntryPath) {
          return customElementPath
        }
        return
      }

      const { query } = parseId(id)

      if (query.original != null) {
        return id
      }
    },

    async load(id, options) {
      if (!options?.ssr) {
        return null
      }

      const { fileName, query } = parseId(id)

      if (!fileName.endsWith('.client.vue')) {
        return null
      }

      // Vue plugin generated code
      if (query.vue) {
        return null
      }

      if (query.original) {
        return fs.readFileSync(fileName, 'utf-8')
      }

      const clientImportId = getClientImportId(fileName)
      const entryImportId = getClientImportId(customElementPath)
      const cssIds = getClientCssIds(fileName)
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
