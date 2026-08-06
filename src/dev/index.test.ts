import fs from 'node:fs/promises'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, test } from 'vite-plus/test'

import { visle } from '../build/index.ts'
import { createRender } from '../server/render.ts'
import { createDevLoader } from './index.ts'

const generatedDir = path.resolve(import.meta.dirname, '../../test/__generated__/dev')

describe('createDevLoader', () => {
  let root: string
  let loader: ReturnType<typeof createDevLoader> | undefined

  beforeEach(async () => {
    await fs.mkdir(generatedDir, { recursive: true })
    root = await fs.mkdtemp(path.join(generatedDir, 'render-'))
  })

  afterEach(async () => {
    await loader?.close()
    loader = undefined
    await fs.rm(root, { recursive: true, force: true })
  })

  test('renders a Vue component from the entry directory', async () => {
    const render = createRender()
    loader = createDevLoader({
      root,
      plugins: [visle()],
      resolve: {
        alias: {
          'visle/internal': path.resolve(import.meta.dirname, '../server/internal.ts'),
        },
      },
    })

    render.setLoader(loader)

    await fs.mkdir(path.join(root, 'src/pages'), { recursive: true })
    await fs.writeFile(
      path.join(root, 'src/pages/Comp.vue'),
      '<template><div>Hello</div></template>',
    )

    await expect(render('Comp')).resolves.toBe(
      '<script type="module" src="/@vite/client" async></script><div>Hello</div>',
    )
  })
})
