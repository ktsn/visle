import path from 'node:path'

import { describe, test, expect, beforeAll } from 'vitest'

import { RenderFunction } from '../../src/server/render.ts'
import {
  createTmpDir,
  copyFixtures,
  prodBuild,
  prodRender,
  listFiles,
  normalizeHashes,
  renderCases,
} from './utils.ts'

describe('Production Build SSR', () => {
  let root: string
  let render: RenderFunction

  beforeAll(async () => {
    root = await createTmpDir('prod')
    await copyFixtures(root)
    await prodBuild(root)
    render = prodRender(root)
  })

  test('Build output files', async () => {
    const clientDir = path.join(root, 'dist/client')
    const files = await listFiles(clientDir)

    const normalized = files.map(normalizeHashes).toSorted()

    expect(normalized).toMatchSnapshot()
  })

  test.for(renderCases)('$name', async ({ component, props }) => {
    const result = await render(component, props)

    expect(normalizeHashes(result)).toMatchSnapshot()
  })
})
