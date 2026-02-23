import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createBuilder } from 'vite'

import { visle } from '../src/build/index.ts'
import { createDevLoader } from '../src/server/dev.ts'
import { createRender } from '../src/server/render.ts'

const tmpDir = path.resolve('test/__generated__/integration')
const fixturesDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'fixtures')

export const renderCases: { name: string; component: string; props?: Record<string, unknown> }[] = [
  { name: 'Static component rendering', component: 'static' },
  { name: 'Component with props', component: 'with-props', props: { message: 'Hello Props' } },
  { name: 'Component with island', component: 'with-island' },
  { name: 'Component with CSS', component: 'with-css' },
  { name: 'Island with props', component: 'with-island-props' },
  { name: 'Component in subdirectory', component: 'nested/index' },
  { name: 'Server component with slot', component: 'with-slot' },
  { name: 'Full HTML document with head/body', component: 'document' },
  { name: 'CSS modules', component: 'with-css-module' },
  { name: 'Nested island', component: 'with-nested-island' },
  { name: 'Multiple islands on the same page', component: 'with-multiple-islands' },
]

/**
 * Create a unique temporary directory for a test suite.
 */
export async function createTmpDir(name: string): Promise<string> {
  const root = path.join(tmpDir, name)
  await fs.rm(root, { recursive: true, force: true })
  await fs.mkdir(root, { recursive: true })
  return root
}

/**
 * Copy fixture files into a temporary directory.
 */
export async function copyFixtures(root: string): Promise<void> {
  await fs.cp(fixturesDir, root, { recursive: true })
}

/**
 * Create a dev mode render function.
 */
export function devRender(root: string) {
  const render = createRender()

  const loader = createDevLoader({
    root,
    plugins: [visle()],
  })

  render.setLoader(loader)

  return { render, close: () => loader.close() }
}

/**
 * Run a production Vite build.
 */
export async function prodBuild(root: string): Promise<void> {
  const builder = await createBuilder({
    root,
    plugins: [visle()],
    logLevel: 'silent',
  })

  await builder.buildApp()
}

/**
 * Create a prod mode render function (after prodBuild).
 */
export function prodRender(root: string) {
  return createRender({
    serverOutDir: path.join(root, 'dist/server'),
  })
}

/**
 * Replace unstable hashes with stable placeholders for snapshot matching.
 * - Vite content hash: "Counter-Cv0abcde.js" -> "Counter-[hash].js"
 * - CSS module class: "_container_184t0_2" -> "_container_[css-module-hash]_2"
 * - Vue scoped attr: "data-v-aa4849be" -> "data-v-[scoped]"
 * - Vue scoped in URL: "scoped=aa4849be" -> "scoped=[scoped]"
 */
export function normalizeHashes(html: string): string {
  return html
    .replace(/-[A-Za-z0-9_-]{8}\.(js|css)/g, '-[hash].$1')
    .replace(/(_\w+)_[a-z0-9]{5}_(\d+)/g, '$1_[css-module-hash]_$2')
    .replace(/(data-v-)[a-f0-9]{8}/g, '$1[scoped]')
    .replace(/(scoped=)[a-f0-9]{8}/g, '$1[scoped]')
}

/**
 * List all files in a directory recursively, returning paths relative to the directory.
 */
export async function listFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true, recursive: true })
  return entries
    .filter((e) => e.isFile())
    .map((e) => path.relative(dir, path.join(e.parentPath, e.name)))
}
