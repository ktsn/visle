import { describe, test, expect, beforeAll } from 'vitest'

import { createTmpDir, copyFixtures, devRender, renderCases } from './utils.ts'

describe('Dev Server SSR', () => {
  let render: (path: string, props?: any) => Promise<string>

  beforeAll(async () => {
    const root = await createTmpDir('dev')
    await copyFixtures(root)
    render = devRender(root)
  })

  test.for(renderCases)('$name', async ({ component, props }) => {
    const result = await render(component, props)

    expect(result).toMatchSnapshot()
  })
})
