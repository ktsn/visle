import fs from 'node:fs/promises'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, test } from 'vite-plus/test'

import { prodBuild } from '../../../test/utils.ts'
import { entryKeyToHtmlPath } from './generate-html.ts'

const generatedDir = path.resolve(import.meta.dirname, '../../../test/__generated__/server')

let root: string

beforeEach(async () => {
  await fs.mkdir(generatedDir, { recursive: true })
  root = await fs.mkdtemp(path.join(generatedDir, 'generate-html-'))
  await fs.mkdir(path.join(root, 'pages'), { recursive: true })
})

afterEach(async () => {
  await fs.rm(root, { recursive: true, force: true })
})

describe('entryKeyToHtmlPath', () => {
  test('index maps to index.html', () => {
    expect(entryKeyToHtmlPath('index')).toBe('index.html')
  })

  test('non-index maps to name/index.html', () => {
    expect(entryKeyToHtmlPath('profile')).toBe('profile/index.html')
  })

  test('nested index maps to nested/index.html', () => {
    expect(entryKeyToHtmlPath('nested/index')).toBe('nested/index.html')
  })

  test('nested non-index maps to nested/name/index.html', () => {
    expect(entryKeyToHtmlPath('nested/detail')).toBe('nested/detail/index.html')
  })
})

describe('generateHtmlPlugin', () => {
  test('outputs rendered HTML for each .vue entry', async () => {
    await fs.writeFile(path.join(root, 'pages/index.vue'), '<template><h1>Home</h1></template>')
    await fs.writeFile(path.join(root, 'pages/about.vue'), '<template><p>About</p></template>')

    await prodBuild(root, {}, { generate: true })

    const indexHtml = await fs.readFile(path.join(root, 'dist/client/index.html'), 'utf-8')
    expect(indexHtml).toContain('<h1>Home</h1>')

    const aboutHtml = await fs.readFile(path.join(root, 'dist/client/about/index.html'), 'utf-8')
    expect(aboutHtml).toContain('<p>About</p>')
  })
})
