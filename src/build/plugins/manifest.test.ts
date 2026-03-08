import fs from 'node:fs'
import path from 'node:path'

import { beforeEach, afterEach, describe, expect, test } from 'vitest'

import { manifestFileName } from './manifest.ts'
import { prodBuild } from '../../../test/utils.ts'

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

describe('build manifest CSS order', () => {
  test('cssMap preserves depth-first import order', async () => {
    fs.writeFileSync(
      path.join(root, 'pages/child-a.vue'),
      '<template><div>A</div></template><style>h1 { color: red; }</style>',
    )
    fs.writeFileSync(
      path.join(root, 'pages/child-c.vue'),
      '<template><div>C</div></template><style>h2 { color: blue; }</style>',
    )
    fs.writeFileSync(
      path.join(root, 'pages/child-b.vue'),
      '<template><div>B</div></template><style>h3 { color: green; }</style>',
    )
    fs.writeFileSync(
      path.join(root, 'pages/parent.vue'),
      '<template><ChildA /><ChildC /><ChildB /></template><script setup>import ChildA from "./child-a.vue"\nimport ChildC from "./child-c.vue"\nimport ChildB from "./child-b.vue"</script>',
    )

    await prodBuild(root)

    const manifestPath = path.join(root, 'dist/server', manifestFileName)
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
    const cssList: string[] = manifest.cssMap['pages/parent.vue']

    expect(cssList).toBeDefined()
    expect(cssList).toHaveLength(3)

    // Order must match depth-first import traversal: child-a, child-c, child-b
    expect(cssList[0]).toEqual(expect.stringMatching(/child-a/))
    expect(cssList[1]).toEqual(expect.stringMatching(/child-c/))
    expect(cssList[2]).toEqual(expect.stringMatching(/child-b/))
  })
})
