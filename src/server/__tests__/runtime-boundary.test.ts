import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, test } from 'vite-plus/test'

const serverDir = path.resolve(import.meta.dirname, '..')

/**
 * Resolve specifier to actual file path. Return undefined if it is not a relative path.
 */
function resolveSource(importer: string, specifier: string): string | undefined {
  if (!specifier.startsWith('.')) {
    return undefined
  }

  const resolved = path.resolve(path.dirname(importer), specifier)
  const candidates = [resolved.replace(/\.js$/, '.ts'), resolved, path.join(resolved, 'index.ts')]
  return candidates.find((candidate) => fs.existsSync(candidate))
}

function collectImportGraph(entryPoints: string[]) {
  const files = new Set<string>()
  const externalImports = new Set<string>()
  const pending = [...entryPoints]

  while (pending.length > 0) {
    const file = pending.pop()!
    if (files.has(file)) {
      continue
    }
    files.add(file)

    const source = fs.readFileSync(file, 'utf-8')
    const importPattern = /(?:import|export)\s+(?:type\s+)?(?:[^'";]*?\sfrom\s*)?['"]([^'"]+)['"]/g

    for (const match of source.matchAll(importPattern)) {
      const specifier = match[1]!
      const resolved = resolveSource(file, specifier)
      if (resolved) {
        pending.push(resolved)
      } else {
        externalImports.add(specifier)
      }
    }
  }

  return { files, externalImports }
}

describe('production runtime dependency boundary', () => {
  test('root and internal entry points do not reach Node or development modules', () => {
    const graph = collectImportGraph([
      path.join(serverDir, 'index.ts'),
      path.join(serverDir, 'internal.ts'),
    ])

    // Check if there is no forbidden dependencies for server runtime.
    expect([...graph.externalImports].filter((id) => id.startsWith('node:'))).toEqual([])
    expect(graph.externalImports).not.toContain('vite')
    expect(graph.externalImports).not.toContain('connect')

    // Check if there is no dependency to dev/build directories.
    const sourceFiles = [...graph.files].map((file) => path.relative(path.dirname(serverDir), file))
    expect(sourceFiles.some((file) => file.startsWith(`dev${path.sep}`))).toBe(false)
    expect(sourceFiles.some((file) => file.startsWith(`build${path.sep}`))).toBe(false)
  })
})
