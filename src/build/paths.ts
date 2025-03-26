import path from 'node:path'
import fs from 'node:fs'
import { globSync } from 'glob'
import { ResolvedIslandsConfig } from './config.js'

// -----------------------------
// Custom Element Paths
// -----------------------------
export const virtualCustomElementEntryPath = '/@visle/entry'
export const customElementEntryPath = path.resolve(
  // In Deno, import.meta.dirname can be undefined (in https module).
  // Just casting it to string for now.
  import.meta.dirname as string,

  // The extension can be different between environments.
  // e.g. in testing env, it is `.ts` while in production it is `.js`.
  `../client/custom-element${path.extname(import.meta.url)}`,
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
  const dirPath = path.join(root, serverOutDir)
  const mjsPath = path.resolve(dirPath, 'server-entry.mjs')
  const jsPath = path.resolve(dirPath, 'server-entry.js')

  if (fs.existsSync(mjsPath)) {
    return mjsPath
  }
  return jsPath
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
