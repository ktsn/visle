import fs from 'node:fs/promises'
import path from 'node:path'

import type { Plugin } from 'vite'

import type { ResolvedVisleConfig } from '../config.js'
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
  let root: string
  let entryRoot: string
  let dtsPath: string
  let lastContent: string | undefined

  async function generateAndWrite(): Promise<void> {
    const componentIds = resolveServerComponentIds(entryRoot)
    const content = generateEntryTypesCode(entryRoot, root, componentIds)

    if (content === lastContent) {
      return
    }

    lastContent = content
    await fs.writeFile(dtsPath, content)
  }

  let timer: ReturnType<typeof setTimeout> | undefined

  function scheduleGenerate(): void {
    clearTimeout(timer)
    timer = setTimeout(generateAndWrite, 100)
  }

  const plugin: Plugin = {
    name: 'visle:entry-types',

    configResolved(viteConfig) {
      root = viteConfig.root
      entryRoot = path.resolve(root, config.entryDir)
      dtsPath = path.join(root, 'visle-generated.d.ts')
    },

    async configureServer(server) {
      function onChange(filePath: string): void {
        if (filePath.endsWith('.vue') && filePath.startsWith(entryRoot)) {
          scheduleGenerate()
        }
      }

      server.watcher.on('add', onChange)
      server.watcher.on('unlink', onChange)

      await generateAndWrite()
    },
  }

  return { plugin, generate: generateAndWrite }
}
