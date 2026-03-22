import fs from 'node:fs/promises'

import type { Plugin } from 'vite'

import type { ResolvedVisleConfig } from '../../shared/config.js'
import { type AbsolutePath, asAbs, dirname, resolve } from '../../shared/path.js'
import { generateEntryTypesCode } from '../generate.js'
import { resolveServerComponentIds } from '../paths.js'

/**
 * Plugin that generates `visle-generated.d.ts`.
 * In dev, it watches for entry component file additions/removals to keep it updated.
 * In build, the returned `generate` function is called from `buildApp`.
 */
export function entryTypesPlugin(config: ResolvedVisleConfig): {
  plugin: Plugin
  generate: () => Promise<void>
} {
  if (config.dts === null) {
    return {
      plugin: { name: 'visle:entry-types' },
      generate: () => Promise.resolve(),
    }
  }

  let root: AbsolutePath
  let entryRoot: AbsolutePath
  let dtsPath: AbsolutePath
  let lastContent: string | undefined

  async function generateAndWrite(): Promise<void> {
    const componentIds = resolveServerComponentIds(entryRoot)
    const dtsDir = dirname(dtsPath)
    const content = generateEntryTypesCode(entryRoot, dtsDir, componentIds)

    if (content === lastContent) {
      return
    }

    lastContent = content
    await fs.mkdir(dtsDir, { recursive: true })
    await fs.writeFile(dtsPath, content)
  }

  let timer: ReturnType<typeof setTimeout> | undefined

  function scheduleGenerate(onError: (error: unknown) => void): void {
    clearTimeout(timer)
    timer = setTimeout(() => {
      generateAndWrite().catch(onError)
    }, 100)
  }

  const plugin: Plugin = {
    name: 'visle:entry-types',

    configResolved(viteConfig) {
      root = asAbs(viteConfig.root)
      entryRoot = resolve(root, config.entryDir)
      dtsPath = resolve(root, config.dts!)
    },

    async configureServer(server) {
      const onChange = (filePath: string) => {
        if (filePath.endsWith('.vue') && filePath.startsWith(entryRoot)) {
          scheduleGenerate(() => {
            this.warn(`Failed to generate a dts file to ${config.dts!}`)
          })
        }
      }

      server.watcher.on('add', onChange)
      server.watcher.on('unlink', onChange)

      await generateAndWrite()
    },
  }

  return { plugin, generate: generateAndWrite }
}
