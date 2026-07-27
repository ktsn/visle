import fs from 'node:fs/promises'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, test } from 'vite-plus/test'

import { prodBuild } from '../../../test/utils.ts'
import { manifestFileName } from '../../shared/manifest.ts'

const generatedDir = path.resolve(import.meta.dirname, '../../../test/__generated__/server')

let root: string

beforeEach(async () => {
  await fs.mkdir(generatedDir, { recursive: true })
  root = await fs.mkdtemp(path.join(generatedDir, 'build-manifest-'))
  await fs.mkdir(path.join(root, 'pages'), { recursive: true })
})

afterEach(async () => {
  await fs.rm(root, { recursive: true, force: true })
})

describe('build manifest CSS map', () => {
  test('collects transitive CSS', async () => {
    await fs.writeFile(
      path.join(root, 'pages/child-a.vue'),
      '<template><div>A</div></template><style>h1 { color: red; }</style>',
    )
    await fs.writeFile(
      path.join(root, 'pages/child-b.vue'),
      '<template><div>B</div><ChildC /></template><script setup>import ChildC from "./child-c.vue"</script><style>h3 { color: green; }</style>',
    )
    await fs.writeFile(
      path.join(root, 'pages/child-c.vue'),
      '<template><div>C</div></template><style>h2 { color: blue; }</style>',
    )
    await fs.writeFile(
      path.join(root, 'pages/parent.vue'),
      '<template><ChildA /><ChildB /></template><script setup>import ChildA from "./child-a.vue"\nimport ChildB from "./child-b.vue"</script>',
    )

    await prodBuild(root)

    const manifestPath = path.join(root, 'dist/server', manifestFileName)
    const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8'))
    const cssList: string[] = manifest.cssMap['pages/parent.vue']

    expect(cssList).toBeDefined()
    expect(cssList).toHaveLength(3)

    expect(cssList).toContainEqual(expect.stringMatching(/child-a/))
    expect(cssList).toContainEqual(expect.stringMatching(/child-b/))
    expect(cssList).toContainEqual(expect.stringMatching(/child-c/))
  })
})
