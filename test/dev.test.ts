import { describe, test, expect, beforeAll, afterAll } from 'vitest'

import { RenderFunction } from '../src/server/render.ts'
import { createTmpDir, copyFixtures, devRender, normalizeHashes, renderCases } from './utils.ts'

describe('Dev Server SSR', () => {
  let render: RenderFunction
  let close: () => Promise<void>

  beforeAll(async () => {
    const root = await createTmpDir('dev')
    await copyFixtures(root)
    ;({ render, close } = devRender(root))
  })

  afterAll(async () => {
    await close()
  })

  test.for(renderCases)('$name', async ({ component, props }) => {
    const result = await render(component, props)

    expect(normalizeHashes(result)).toMatchSnapshot()
  })
})
