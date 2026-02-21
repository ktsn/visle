import path from 'node:path'
import { describe, test, expect, beforeAll } from 'vitest'

import {
  createTmpDir,
  copyFixtures,
  prodBuild,
  prodRender,
  listFiles,
  renderCases,
} from './utils.ts'

/**
 * Replace content-hashed filenames with stable placeholders for snapshot matching.
 * Vite uses base64url hashes (A-Za-z0-9_-) that are 8 characters long.
 * e.g. "/assets/Counter.island-Cv0abcde.js" -> "/assets/Counter.island-[hash].js"
 */
function normalizeHashes(html: string): string {
  return html.replace(/-[A-Za-z0-9_-]{8}\.(js|css)/g, '-[hash].$1')
}

describe('Production Build SSR', () => {
  let root: string
  let render: (path: string, props?: any) => Promise<string>

  beforeAll(async () => {
    root = await createTmpDir('prod')
    await copyFixtures(root)
    await prodBuild(root)
    render = prodRender(root)
  })

  test('Build output files', async () => {
    const clientDir = path.join(root, 'dist/client')
    const files = await listFiles(clientDir)

    // Normalize hashed filenames and sort for deterministic snapshot
    const normalized = files
      .map((f) => f.replace(/-[A-Za-z0-9_-]{8}\.(js|css)$/, '-[hash].$1'))
      .toSorted()

    expect(normalized).toMatchSnapshot()
  })

  test.for(renderCases)('$name', async ({ component, props }) => {
    const result = await render(component, props)

    expect(normalizeHashes(result)).toMatchSnapshot()
  })
})
