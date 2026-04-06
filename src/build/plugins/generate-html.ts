import type { Plugin } from 'vite'

import { createRender } from '../../server/render.js'
import type { ResolvedVisleConfig } from '../../shared/config.js'
import { asAbs, relative, resolve } from '../../shared/path.js'
import { resolveServerComponentIds } from '../paths.js'

export const generateVirtualEntryId = '\0@visle/generate-entry'

export function entryKeyToHtmlPath(entryKey: string): string {
  if (entryKey === 'index' || entryKey.endsWith('/index')) {
    return `${entryKey}.html`
  }
  return `${entryKey}/index.html`
}

export function generateHtmlPlugin(visleConfig: ResolvedVisleConfig): Plugin {
  return {
    name: 'visle:generate-html',
    apply: 'build',
    sharedDuringBuild: true,

    applyToEnvironment: (env) => env.name === 'generate',

    resolveId(id) {
      if (id === generateVirtualEntryId) {
        return id
      }
    },

    load(id) {
      if (id === generateVirtualEntryId) {
        return 'export default {}'
      }
    },

    async generateBundle(_options, bundle) {
      const root = asAbs(this.environment.config.root)
      const serverOutDir = resolve(root, visleConfig.serverOutDir)
      const entryDir = resolve(root, visleConfig.entryDir)

      const componentIds = resolveServerComponentIds(entryDir)
      const entryKeys = componentIds.map((id) => relative(entryDir, id).replace(/\.vue$/, ''))

      const render = createRender({ serverOutDir })

      const htmlResults = await Promise.all(
        entryKeys.map(async (key) => ({
          fileName: entryKeyToHtmlPath(key),
          source: await render(key),
        })),
      )

      for (const { fileName, source } of htmlResults) {
        this.emitFile({ type: 'asset', fileName, source })
      }

      for (const key of Object.keys(bundle)) {
        if (bundle[key]?.type === 'chunk') {
          delete bundle[key]
        }
      }
    },
  }
}
