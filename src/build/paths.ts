import path from 'node:path'
import fs from 'node:fs'
import { globSync } from 'glob'

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
export function resolveServerComponentIds(componentDir: string): string[] {
  const islandPaths = new Set(resolvePattern('/**/*.island.vue', componentDir))
  const vuePaths = resolvePattern('/**/*.vue', componentDir)

  return vuePaths.filter((p) => !islandPaths.has(p))
}

/**
 * Resolves the path for a component in development mode
 */
export function resolveDevComponentPath(
  componentDir: string,
  componentPath: string,
): string {
  return path.resolve(componentDir, `${componentPath}.vue`)
}

/**
 * Resolves the path to the server dist directory
 */
export function resolveServerDistPath(serverOutDir: string): string {
  const mjsPath = path.resolve(serverOutDir, 'server-entry.mjs')
  const jsPath = path.resolve(serverOutDir, 'server-entry.js')

  if (fs.existsSync(mjsPath)) {
    return mjsPath
  }
  return jsPath
}

/**
 * Resolves the client manifest file path
 */
export function resolveClientManifestPath(clientOutDir: string): string {
  return path.resolve(clientOutDir, '.vite/manifest.json')
}

/**
 * Resolves the entry metadata file path
 */
export function resolveEntryMetadataPath(clientOutDir: string): string {
  return path.resolve(clientOutDir, entryMetadataPath)
}
