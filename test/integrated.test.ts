import { execFile } from 'node:child_process'
import path from 'node:path'
import { promisify } from 'node:util'

import {
  createBuilder,
  createRunnableDevEnvironment,
  createServer,
  RunnableDevEnvironment,
  type ViteDevServer,
} from 'vite'
import { afterAll, beforeAll, describe, expect, test, vi } from 'vite-plus/test'

import { visle } from '../src/build/index.ts'
import { copyFixtures, createTmpDir, normalizeHashes, removeTmpDir } from './utils.ts'

const execFileAsync = promisify(execFile)
const internalPath = path.resolve(import.meta.dirname, '../src/server/internal.ts')
const serverIndexPath = path.resolve(import.meta.dirname, '../src/server/index.ts')
const viteLoaderPath = path.resolve(import.meta.dirname, '../src/server/vite.ts')

function aliases(root: string) {
  return [
    { find: '@', replacement: root },
    { find: /^visle$/, replacement: serverIndexPath },
    { find: /^visle\/internal$/, replacement: internalPath },
    { find: /^visle\/vite$/, replacement: viteLoaderPath },
  ]
}

describe('Integrated server build', () => {
  let root: string

  beforeAll(async () => {
    root = await createTmpDir('integrated')
    await copyFixtures(root)

    const builder = await createBuilder({
      root,
      base: '/base/',
      plugins: [
        visle({
          entryDir: 'pages',
          dts: null,
          serverBuild: 'integrated',
        }),
      ],
      environments: {
        ssr: {
          consumer: 'server',
          build: {
            rollupOptions: {
              input: path.join(root, 'vite-loader.ts'),
              output: { entryFileNames: 'worker.js' },
            },
            ssr: true,
          },
        },
      },
      resolve: {
        alias: aliases(root),
      },
      logLevel: 'silent',
    })

    await builder.buildApp()
  })

  afterAll(async () => {
    await removeTmpDir('integrated')
  })

  test('renders a component with its resolved CSS and JavaScript assets', async () => {
    const { stdout, stderr } = await execFileAsync(
      process.execPath,
      [path.join(root, 'dist/server/worker.js')],
      { cwd: root },
    )

    expect(stderr).toBe('')
    expect(normalizeHashes(stdout.trim())).toMatchSnapshot()
  })
})

describe('Integrated development server', () => {
  let root: string
  let server: ViteDevServer | undefined

  beforeAll(async () => {
    root = await createTmpDir('integrated-dev')
    await copyFixtures(root)

    server = await createServer({
      configFile: false,
      root,
      base: '/base/',
      plugins: [
        visle({
          entryDir: 'pages',
          dts: null,
          serverBuild: 'integrated',
        }),
      ],
      environments: {
        ssr: {
          consumer: 'server',
          dev: {
            createEnvironment: (name, config) => createRunnableDevEnvironment(name, config),
          },
        },
      },
      resolve: { alias: aliases(root) },
      server: { middlewareMode: true },
      optimizeDeps: { noDiscovery: true },
      logLevel: 'silent',
    })
  })

  afterAll(async () => {
    await server?.close()
    await removeTmpDir('integrated-dev')
  })

  test('renders a component with its resolved development assets', async () => {
    // oxlint-disable-next-line no-unsafe-type-assertion
    const environment = server?.environments.ssr as RunnableDevEnvironment

    const output: string[] = []
    const consoleLog = vi
      .spyOn(console, 'log')
      .mockImplementation((message) => output.push(String(message)))

    try {
      await environment.runner.import(path.join(root, 'vite-loader.ts'))
    } finally {
      consoleLog.mockRestore()
    }

    expect(output).toHaveLength(1)
    expect(normalizeHashes(output[0]!)).toMatchSnapshot()
  })
})
