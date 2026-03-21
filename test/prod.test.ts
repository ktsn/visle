import fs from 'node:fs/promises'
import path from 'node:path'

import { describe, test, expect, beforeAll } from 'vite-plus/test'

import { RenderFunction } from '../src/server/render.ts'
import { manifestFileName } from '../src/shared/manifest.ts'
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

    const manifestPath = path.join(root, 'dist/server', manifestFileName)
    const manifestJson = await fs.readFile(manifestPath, 'utf-8')
    expect(JSON.parse(normalizeHashes(manifestJson))).toMatchSnapshot()
  })

  test('Type definition file is generated in project root', async () => {
    const dtsPath = path.join(root, 'visle-generated.d.ts')
    const content = await fs.readFile(dtsPath, 'utf-8')

    expect(content).toMatchSnapshot()
  })

  test.for(renderCases)('$name', async ({ component, props }) => {
    const result = await render(component, props)

    expect(normalizeHashes(result)).toMatchSnapshot()
  })
})

describe('Production Build SSR with manual chunks', () => {
  let root: string
  let render: RenderFunction

  beforeAll(async () => {
    root = await createTmpDir('prod-manual-chunks')
    await copyFixtures(root)
    await prodBuild(root, {
      environments: {
        style: {
          build: {
            rollupOptions: {
              output: {
                manualChunks: () => 'style',
              },
            },
          },
        },
      },
    })
    render = prodRender(root)
  })

  test('all styles are merged into one CSS file', async () => {
    const clientDir = path.join(root, 'dist/client')
    const files = await listFiles(clientDir)
    const cssFiles = files.filter((f) => f.endsWith('.css'))

    expect(cssFiles).toHaveLength(1)
  })

  test('shared CSS page includes the merged CSS', async () => {
    const result = await render('with-shared-css')

    expect(normalizeHashes(result)).toMatchSnapshot()
  })

  test('dynamic import shared CSS page includes the merged CSS', async () => {
    const result = await render('with-dynamic-shared-css')

    expect(normalizeHashes(result)).toMatchSnapshot()
  })
})
