import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { describe, test, expect, beforeAll, afterAll } from 'vite-plus/test'

import { bundleFileName, serverEntryFileName } from '../src/build/generate.ts'
import { RenderFunction } from '../src/server/render.ts'
import { manifestFileName } from '../src/shared/manifest.ts'
import {
  createTmpDir,
  removeTmpDir,
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
    render = await prodRender(root)
  })

  afterAll(async () => {
    await removeTmpDir('prod')
  })

  test('Build output files', async () => {
    const clientDir = path.join(root, 'dist/client')
    const files = await listFiles(clientDir)

    const normalized = files.map(normalizeHashes).toSorted()

    expect(normalized).toMatchSnapshot('client output files')

    const manifestPath = path.join(root, 'dist/server', manifestFileName)
    const manifestJson = await fs.readFile(manifestPath, 'utf-8')
    expect(JSON.parse(normalizeHashes(manifestJson))).toMatchSnapshot('server manifest')
  })

  test('Type definition file is generated', async () => {
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
    render = await prodRender(root)
  })

  afterAll(async () => {
    await removeTmpDir('prod-manual-chunks')
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

describe('Production bundle with custom server output', () => {
  let root: string

  beforeAll(async () => {
    root = await createTmpDir('prod-bundle')
    await fs.mkdir(path.join(root, 'pages'), { recursive: true })
    await fs.writeFile(path.join(root, 'pages/index.vue'), '<template><div>Home</div></template>')

    await prodBuild(root, {}, { serverOutDir: 'custom/server' })
  })

  afterAll(async () => {
    await removeTmpDir('prod-bundle')
  })

  test('imports the configured server entry and final manifest', async () => {
    const serverDir = path.join(root, 'custom/server')
    const bundlePath = path.join(serverDir, bundleFileName)
    const bundleCode = await fs.readFile(bundlePath, 'utf-8')
    const manifest = JSON.parse(await fs.readFile(path.join(serverDir, manifestFileName), 'utf-8'))

    await expect(fs.access(path.join(serverDir, serverEntryFileName))).resolves.toBeUndefined()
    expect(bundleCode).toContain(`import entries from "./${serverEntryFileName}"`)
    expect(bundleCode).toContain(
      `import manifest from "./${manifestFileName}" with { type: "json" }`,
    )

    const bundle = (await import(pathToFileURL(bundlePath).href)).default
    expect(bundle.manifest).toEqual(manifest)
    expect(Object.keys(bundle.entries)).toEqual(['index'])
  })
})
