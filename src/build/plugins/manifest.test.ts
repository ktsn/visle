import fs from 'node:fs'
import path from 'node:path'

import { beforeEach, afterEach, describe, expect, test } from 'vite-plus/test'

import { prodBuild } from '../../../test/utils.ts'
import { manifestFileName } from '../../core/manifest.ts'

const generatedDir = path.resolve(import.meta.dirname, '../../../test/__generated__/server')

let root: string

beforeEach(() => {
  fs.mkdirSync(generatedDir, { recursive: true })
  root = fs.mkdtempSync(path.join(generatedDir, 'build-manifest-'))
  fs.mkdirSync(path.join(root, 'pages'), { recursive: true })
})

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true })
})

describe('build manifest CSS map', () => {
  test('collects transitive CSS', async () => {
    fs.writeFileSync(
      path.join(root, 'pages/child-a.vue'),
      '<template><div>A</div></template><style>h1 { color: red; }</style>',
    )
    fs.writeFileSync(
      path.join(root, 'pages/child-b.vue'),
      '<template><div>B</div><ChildC /></template><script setup>import ChildC from "./child-c.vue"</script><style>h3 { color: green; }</style>',
    )
    fs.writeFileSync(
      path.join(root, 'pages/child-c.vue'),
      '<template><div>C</div></template><style>h2 { color: blue; }</style>',
    )
    fs.writeFileSync(
      path.join(root, 'pages/parent.vue'),
      '<template><ChildA /><ChildB /></template><script setup>import ChildA from "./child-a.vue"\nimport ChildB from "./child-b.vue"</script>',
    )

    await prodBuild(root)

    const manifestPath = path.join(root, 'dist/server', manifestFileName)
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
    const cssList: string[] = manifest.cssMap['pages/parent.vue']

    expect(cssList).toBeDefined()
    expect(cssList).toHaveLength(3)

    expect(cssList).toContainEqual(expect.stringMatching(/child-a/))
    expect(cssList).toContainEqual(expect.stringMatching(/child-b/))
    expect(cssList).toContainEqual(expect.stringMatching(/child-c/))
  })
})
