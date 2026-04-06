import type { Plugin } from 'vite'
import type { ConcreteComponent } from 'vue'

import { createRender } from '../../server/render.js'
import type { ResolvedVisleConfig } from '../../shared/config.js'
import { resolveServerDistPath } from '../../shared/entry.js'
import { asAbs, resolve } from '../../shared/path.js'

export const generateVirtualEntryId = '\0@visle/generate-entry'

export function entryKeyToHtmlPath(entryKey: string): string {
  if (entryKey === 'index' || entryKey.endsWith('/index')) {
    return `${entryKey}.html`
  }
  return `${entryKey}/index.html`
}

function hasProps(component: ConcreteComponent): boolean {
  const props = component.props
  if (!props) {
    return false
  }
  if (Array.isArray(props)) {
    return props.length > 0
  }
  return Object.keys(props).length > 0
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

      const serverEntry = await import(/* @vite-ignore */ resolveServerDistPath(serverOutDir))
      const components: Record<string, ConcreteComponent> = serverEntry.default
      const entryKeys = Object.keys(components)

      const entriesWithProps = entryKeys.filter((key) => hasProps(components[key]!))
      if (entriesWithProps.length > 0) {
        const list = entriesWithProps.map((key) => `  - ${key}`).join('\n')
        this.error(`The following entries cannot have props when using generate option:\n${list}`)
      }

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
