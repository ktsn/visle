import path from 'node:path'

import { globSync } from 'glob'

import { type AbsolutePath, asAbs, asRel, join, resolve } from '../shared/path.js'
import { componentWrapPrefix } from './generate.js'

// -----------------------------
// Custom Element Paths
// -----------------------------
export const islandsBootstrapPath = resolve(
  // In Deno, import.meta.dirname can be undefined (in https module).
  // Just casting it to string for now.
  // oxlint-disable-next-line typescript/no-unnecessary-type-assertion
  asAbs(import.meta.dirname as string),

  // The extension can be different between environments.
  // e.g. in testing env, it is `.ts` while in production it is `.js`.
  asRel(`../client/custom-element${path.extname(import.meta.url)}`),
)

// -----------------------------
// Path Resolution Functions
// -----------------------------

/**
 * Resolves glob patterns to find files
 */
export function resolvePattern(pattern: string | string[], root: AbsolutePath): AbsolutePath[] {
  if (typeof pattern === 'string') {
    return globSync(join(root, pattern)).map(asAbs)
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
export function resolveServerComponentIds(entryDir: AbsolutePath): AbsolutePath[] {
  return resolvePattern('/**/*.vue', entryDir)
}
