import path from 'node:path'
import { globSync } from 'glob'
import { ResolvedIslandsConfig } from './config.js'

// -----------------------------
// Custom Element Paths
// -----------------------------
export const virtualCustomElementEntryPath = '/@vue-islands-renderer/entry'
export const customElementEntryPath = path.resolve(
  import.meta.dirname,
  '../client/custom-element.js',
)

// -----------------------------
// Metadata Paths
// -----------------------------
export const entryMetadataPath = '.vite/entry-metadata.json'

// -----------------------------
// Path Resolution Functions
// -----------------------------

/**
 * Converts a component path to a valid export name
 */
export function pathToExportName(targetPath: string): string {
  const stripped = targetPath.replace(/^\//, '').replace(/\.vue$/, '')
  const replaced = stripped
    .replaceAll('$', '$$')
    .replaceAll('.', '$')
    .replaceAll('_', '__')
    .replaceAll('/', '_')

  return `_${replaced}`
}

/**
 * Resolves glob patterns to find files
 */
export function resolvePattern(
  pattern: string | string[],
  root: string,
): string[] {
  if (typeof pattern === 'string') {
    return globSync(path.join(root, pattern))
  }

  return pattern.flatMap((p) => resolvePattern(p, root))
}

/**
 * Parses a file ID into filename and query parts
 */
export interface ParsedIdQuery {
  original?: boolean
  vue?: boolean
}

export function parseId(id: string): {
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

/**
 * Resolves paths for all server components
 */
export function resolveServerComponentIds(
  config: ResolvedIslandsConfig,
): string[] {
  const { root, componentDir } = config
  const basePath = path.join(root, componentDir)

  const islandPaths = new Set(resolvePattern('/**/*.island.vue', basePath))
  const vuePaths = resolvePattern('/**/*.vue', basePath)

  return vuePaths.filter((p) => !islandPaths.has(p))
}

/**
 * Resolves the path for a component in development mode
 */
export function resolveDevComponentPath(
  config: ResolvedIslandsConfig,
  componentPath: string,
): string {
  const { root, componentDir } = config

  return path.resolve(path.join(root, componentDir, `${componentPath}.vue`))
}

/**
 * Resolves the path to the server dist directory
 */
export function resolveServerDistPath(config: ResolvedIslandsConfig): string {
  const { root, serverOutDir } = config
  return path.resolve(path.join(root, serverOutDir, 'server-entry.js'))
}

/**
 * Resolves the client manifest file path
 */
export function resolveClientManifestPath(
  config: ResolvedIslandsConfig,
): string {
  return path.resolve(config.root, config.clientOutDir, '.vite/manifest.json')
}

/**
 * Resolves the entry metadata file path
 */
export function resolveEntryMetadataPath(
  config: ResolvedIslandsConfig,
): string {
  return path.resolve(config.root, config.clientOutDir, entryMetadataPath)
}
