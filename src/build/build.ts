import path from 'node:path'
import { build as viteBuild } from 'vite'
import { globSync } from 'glob'
import { customElementEntryPath } from './client-manifest.js'
import { clientVirtualEntryId, serverVirtualEntryId } from './generate.js'
import plugin from './plugin.js'
import { defaultConfig } from './config.js'

export async function build(): Promise<void> {
  await buildForClient(defaultConfig)
  await buildForServer(defaultConfig)
}

async function buildForServer(config: {
  root: string
  componentDir: string
  clientOutDir: string
  serverOutDir: string
}): Promise<void> {
  await viteBuild({
    root: config.root,
    build: {
      ssr: true,
      outDir: config.serverOutDir,
      rollupOptions: {
        input: [serverVirtualEntryId],
      },
    },
    plugins: [
      plugin({
        componentDir: config.componentDir,
        clientDist: config.clientOutDir,
      }),
    ],
  })
}

async function buildForClient(config: {
  root: string
  componentDir: string
  clientOutDir: string
}): Promise<void> {
  const root = path.resolve(config.root)
  const islandPaths = resolvePattern(
    '/**/*.island.vue',
    path.join(root, config.componentDir),
  )

  await viteBuild({
    root: config.root,
    build: {
      manifest: true,
      outDir: config.clientOutDir,
      rollupOptions: {
        input: [customElementEntryPath, clientVirtualEntryId, ...islandPaths],
        preserveEntrySignatures: 'allow-extension',
      },
    },
    plugins: [
      plugin({
        componentDir: config.componentDir,
        clientDist: config.clientOutDir,
      }),
    ],
  })
}

function resolvePattern(pattern: string | string[], root: string): string[] {
  if (typeof pattern === 'string') {
    return globSync(path.join(root, pattern))
  }

  return pattern.flatMap((p) => resolvePattern(p, root))
}
