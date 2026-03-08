import fs from 'node:fs'
import path from 'node:path'

import { globSync } from 'glob'

import { componentWrapPrefix } from './generate.js'

// -----------------------------
// Custom Element Paths
// -----------------------------
export const virtualIslandsBootstrapPath = '/@visle/bootstrap'
export const islandsBootstrapPath = path.resolve(
  // In Deno, import.meta.dirname can be undefined (in https module).
  // Just casting it to string for now.
  import.meta.dirname as string,

  // The extension can be different between environments.
  // e.g. in testing env, it is `.ts` while in production it is `.js`.
  `../client/custom-element${path.extname(import.meta.url)}`,
)

// -----------------------------
// Path Resolution Functions
// -----------------------------

/**
 * Resolves glob patterns to find files
 */
export function resolvePattern(pattern: string | string[], root: string): string[] {
  if (typeof pattern === 'string') {
    return globSync(path.join(root, pattern))
  }

  return pattern.flatMap((p) => resolvePattern(p, root))
}

export interface ParsedIdQuery {
  vue?: boolean
  names?: string[]
}

/**
 * Parses a file ID into filename and query parts.
 * Handles the `\0visle:wrap:` prefix and `names` query param.
 */
export function parseId(id: string): {
  fileName: string
  query: ParsedIdQuery
  prefix?: string
} {
  let prefix: string | undefined
  let raw = id

  if (raw.startsWith(componentWrapPrefix)) {
    prefix = componentWrapPrefix
    raw = raw.slice(componentWrapPrefix.length)
  }

  const [fileName, searchParams] = raw.split('?')
  const parsed = new URLSearchParams(searchParams)

  const query: ParsedIdQuery = {}
  if (parsed.has('vue')) {
    query.vue = true
  }
  const names = parsed.get('names')
  if (names) {
    query.names = names.split(',').filter(Boolean)
  }

  return {
    fileName: fileName!,
    query,
    prefix,
  }
}

/**
 * Resolves paths for all server components
 */
export function resolveServerComponentIds(entryDir: string): string[] {
  return resolvePattern('/**/*.vue', entryDir)
}

/**
 * Resolves the path for a component in development mode
 */
export function resolveDevComponentPath(entryDir: string, componentPath: string): string {
  return path.resolve(entryDir, `${componentPath}.vue`)
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
