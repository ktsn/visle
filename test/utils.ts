import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createBuilder, mergeConfig, type Plugin, type UserConfig } from 'vite'

import { visle } from '../src/build/index.ts'
import { createDevLoader } from '../src/dev/index.ts'
import { createRender } from '../src/server/render.ts'
import { asRel } from '../src/shared/path.ts'

const tmpDir = path.resolve('test/__generated__/integration')
const fixturesDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'fixtures')
const srcDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src')

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
  { name: 'Non-ascii file name', component: 'non-ascii-テスト' },
  { name: 'Island with alias import', component: 'with-island-alias' },
  { name: 'Named export', component: 'named-export' },
  { name: 'Island with options API', component: 'with-options-api' },
  { name: 'Island with options API renamed component', component: 'with-options-api-renamed' },
  { name: 'CSS with style src', component: 'with-css-src' },
  { name: 'CSS with style src alias', component: 'with-css-src-alias' },
  { name: 'Same component as island and server', component: 'with-mount-variation' },
  { name: 'Island with named import', component: 'with-named-import' },
  { name: 'Island with barrel import', component: 'with-barrel-import' },
  { name: 'Shared CSS common chunk', component: 'with-shared-css' },
  { name: 'Dynamic import shared CSS', component: 'with-dynamic-shared-css' },
  { name: 'CSS import in script', component: 'with-css-import' },
  { name: 'SVG image asset', component: 'with-svg-img' },
  { name: 'Markdown entry component', component: 'markdown-page' },
]

const entryExt = ['.vue', '.md']
const vueInclude = [/\.vue$/, /\.md$/]

/**
 * Test-only plugin that converts `.md` files into Vue SFC text in the load
 * phase, so the rest of the pipeline (visle's server transform and
 * @vitejs/plugin-vue) can treat them as ordinary SFCs. Used to exercise the
 * `entryExt` config with a non-`.vue` extension.
 */
function markdownToVuePlugin(): Plugin {
  return {
    name: 'test:markdown-to-vue',
    enforce: 'pre',
    async load(id) {
      const [fileName, query] = id.split('?')
      if (!fileName?.endsWith('.md')) return null
      // Skip sub-requests emitted by the Vue plugin (e.g. ?vue&type=script)
      if (query?.includes('vue')) return null

      const md = await fs.readFile(fileName, 'utf-8')
      const html = md
        .split('\n')
        .map((line) => {
          const trimmed = line.trim()
          if (trimmed === '') return ''
          if (trimmed.startsWith('# ')) return `<h1>${trimmed.slice(2)}</h1>`
          return `<p>${trimmed}</p>`
        })
        .filter(Boolean)
        .join('')

      return `<template><div>${html}</div></template>`
    },
  }
}

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
 * Remove a temporary directory created by `createTmpDir`.
 */
export async function removeTmpDir(name: string): Promise<void> {
  const root = path.join(tmpDir, name)
  await fs.rm(root, { recursive: true, force: true })
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
    plugins: [
      markdownToVuePlugin(),
      visle({
        entryDir: 'pages',
        entryExt,
        dts: 'visle-generated.d.ts',
        vue: { include: vueInclude },
      }),
    ],
    resolve: {
      alias: {
        '@': root,
        'visle/internal': path.join(srcDir, 'server/internal.ts'),
      },
    },
  })

  render.setLoader(loader)

  return { render, close: () => loader.close() }
}

/**
 * Run a production Vite build with additional config options.
 */
export async function prodBuild(root: string, options: UserConfig = {}): Promise<void> {
  const builder = await createBuilder(
    mergeConfig(
      {
        root,
        plugins: [
          markdownToVuePlugin(),
          visle({
            entryDir: 'pages',
            entryExt,
            dts: 'visle-generated.d.ts',
            vue: { include: vueInclude },
          }),
        ],
        resolve: {
          alias: {
            '@': root,
            'visle/internal': path.join(srcDir, 'server/internal.ts'),
          },
        },
        logLevel: 'silent',
      },
      options,
    ),
  )

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
 * - CSS module class: "_container_184t0_2" -> "_container_[css-module-hash]"
 * - Vue scoped attr: "data-v-aa4849be" -> "data-v-[scoped]"
 * - Vue scoped in URL: "scoped=aa4849be" -> "scoped=[scoped]"
 */
export function normalizeHashes(html: string): string {
  return html
    .replace(/-[A-Za-z0-9_-]{8}\.(js|css|svg)/g, '-[hash].$1')
    .replace(/(_\w+)_[a-z0-9]{5}_\d+/g, '$1_[css-module-hash]')
    .replace(/(data-v-)[a-f0-9]{8}/g, '$1[scoped]')
    .replace(/(scoped=)[a-f0-9]{8}/g, '$1[scoped]')
    .replace(/(src=)[a-f0-9]{8}/g, '$1[src]')
}

/**
 * List all files in a directory recursively, returning paths relative to the directory.
 */
export async function listFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true, recursive: true })
  return entries
    .filter((e) => e.isFile())
    .map((e) => asRel(path.relative(dir, path.join(e.parentPath, e.name))))
}
