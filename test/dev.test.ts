import fs from 'node:fs/promises'
import path from 'node:path'

import { describe, test, expect, beforeAll, afterAll } from 'vitest'

import { RenderFunction } from '../src/server/render.ts'
import { createTmpDir, copyFixtures, devRender, normalizeHashes, renderCases } from './utils.ts'

describe('Dev Server SSR', () => {
  let root: string
  let render: RenderFunction
  let close: () => Promise<void>

  beforeAll(async () => {
    root = await createTmpDir('dev')
    await copyFixtures(root)
    ;({ render, close } = devRender(root))
  })

  afterAll(async () => {
    await close()
  })

  test('Type definition file is generated on dev server start', async () => {
    // Trigger dev server initialization (it starts lazily on first render)
    await render('static')

    const dtsPath = path.join(root, 'visle-generated.d.ts')
    const content = await fs.readFile(dtsPath, 'utf-8')
    expect(content).toMatchSnapshot()
  })

  test.for(renderCases)('$name', async ({ component, props }) => {
    const result = await render(component, props)

    expect(normalizeHashes(result)).toMatchSnapshot()
  })
})
