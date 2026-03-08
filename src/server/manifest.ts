import fs from 'node:fs/promises'
import path from 'node:path'

import type { EnvironmentModuleNode, RunnableDevEnvironment, ViteDevServer } from 'vite'
import { parse, SFCBlock } from 'vue/compiler-sfc'

import { generateComponentId } from '../build/component-id.js'
import { getVisleConfig } from '../build/config.js'
import { virtualIslandsBootstrapPath } from '../build/paths.js'
import { manifestFileName, type ManifestData } from '../build/plugins/manifest.js'
import { isCSS } from '../core/path.js'

export interface RuntimeManifest {
  getClientImportId(componentRelativePath: string): Promise<string>
  getEntryCssIds(componentPath: string): Promise<string[]>
  getIslandsBootstrapId(): Promise<string>
}

/**
 * Loads the manifest file from serverOutDir for production SSR.
 */
export async function loadManifest(serverOutDir: string): Promise<RuntimeManifest> {
  const manifestPath = path.join(serverOutDir, manifestFileName)

  const data: ManifestData = JSON.parse(await fs.readFile(manifestPath, 'utf-8'))
  const basePath = data.base.replace(/\/$/, '')

  return {
    async getClientImportId(componentRelativePath: string): Promise<string> {
      const file = data.jsMap[componentRelativePath]
      if (!file) {
        throw new Error(`${componentRelativePath} not found in manifest JS map`)
      }
      return `${basePath}/${file}`
    },

    async getEntryCssIds(componentPath: string): Promise<string[]> {
      const entryRelativePath = `${data.entryDir}/${componentPath}.vue`
      const cssIds = data.cssMap[entryRelativePath] ?? []
      return cssIds.map((cssId) => `${basePath}/${cssId}`)
    },

    async getIslandsBootstrapId(): Promise<string> {
      return `${basePath}/${data.islandsBootstrap}`
    },
  }
}

/**
 * Creates a dev-mode RuntimeManifest that resolves paths using Vite's dev server.
 */
export function createDevManifest(devServer: ViteDevServer): RuntimeManifest {
  const serverEnv = devServer.environments.server as RunnableDevEnvironment
  const { root, base } = devServer.config
  const { entryDir } = getVisleConfig(devServer.config)

  // Normalize origin value
  const origin = devServer.config.server.origin?.replace(/\/$/, '') ?? ''
  const basePath = basePathForDev(base)

  function applyServeBase(filePath: string): string {
    return `${origin}${basePath}${filePath}`
  }

  async function getComponentCssIds(componentRelativePath: string): Promise<string[]> {
    const absPath = path.resolve(root, componentRelativePath)

    if (!absPath.endsWith('.vue')) {
      return []
    }

    const code = await fs.readFile(absPath, 'utf-8')
    const descriptor = parse(code).descriptor
    const componentId = generateComponentId(componentRelativePath, code, false)

    return Promise.all(
      descriptor.styles.map(async (style, i) => {
        const attrsQuery = attrsToQuery(style.attrs, 'css')
        const srcQuery = style.src ? (style.scoped ? `&src=${componentId}` : '&src=true') : ''
        const scopedQuery = style.scoped ? `&scoped=${componentId}` : ''
        const query = `?vue&type=style&index=${i}${srcQuery}${scopedQuery}`

        let stylePath: string
        if (!style.src) {
          stylePath = `/${componentRelativePath}`
        } else if (style.src.startsWith('.')) {
          stylePath =
            '/' +
            path.posix.normalize(path.posix.join(path.dirname(componentRelativePath), style.src))
        } else {
          const result = await serverEnv.pluginContainer.resolveId(style.src, absPath)
          const resolved = result?.id
          if (resolved) {
            stylePath = '/' + path.relative(root, resolved)
          } else {
            stylePath = '/' + style.src
          }
        }

        let styleId = `${stylePath}${query}${attrsQuery}`

        if (style.module) {
          // inject `.module` before extension so vite handles it as css module
          styleId = styleId.replace(/\.(\w+)$/, '.module.$1')
        }

        return applyServeBase(styleId)
      }),
    )
  }

  return {
    async getClientImportId(componentRelativePath: string): Promise<string> {
      return applyServeBase(`/${componentRelativePath}`)
    },

    async getIslandsBootstrapId(): Promise<string> {
      return applyServeBase(virtualIslandsBootstrapPath)
    },

    async getEntryCssIds(componentPath: string): Promise<string[]> {
      const entryRelativePath = `${entryDir}/${componentPath}.vue`
      const entryAbsPath = path.resolve(root, entryRelativePath)

      const entryMod = serverEnv.moduleGraph.getModuleById(entryAbsPath)
      if (!entryMod) {
        // Module not yet loaded in the module graph, fall back to parsing the entry file
        return getComponentCssIds(entryRelativePath)
      }

      // Walk module graph to find all transitively imported .vue and CSS files
      // preserving discovery order
      const discovered: ({ type: 'css'; id: string } | { type: 'vue'; relativePath: string })[] = []
      const visited = new Set<string>()

      const walk = (mod: EnvironmentModuleNode) => {
        if (!mod.id || visited.has(mod.id)) {
          return
        }
        visited.add(mod.id)

        if (mod.id.endsWith('.vue')) {
          discovered.push({ type: 'vue', relativePath: path.relative(root, mod.id) })
        } else if (!mod.id.includes('?vue') && isCSS(mod.id)) {
          discovered.push({ type: 'css', id: applyServeBase('/' + path.relative(root, mod.id)) })
        }

        for (const imported of mod.importedModules) {
          walk(imported)
        }
      }
      walk(entryMod)

      // Resolve CSS ids in discovery order
      const cssIdArrays = await Promise.all(
        discovered.map((entry) =>
          entry.type === 'css' ? [entry.id] : getComponentCssIds(entry.relativePath),
        ),
      )
      return cssIdArrays.flat()
    },
  }
}

function basePathForDev(base: string): string {
  const baseUrl = new URL(base, 'https://example.com')
  return baseUrl.pathname.replace(/\/$/, '')
}

// these are built-in query parameters so should be ignored
// if the user happen to add them as attrs
const ignoreList = new Set(['id', 'index', 'src', 'type', 'lang', 'module', 'scoped', 'generic'])

/**
 * Borrowed from @vitejs/plugin-vue
 */
function attrsToQuery(
  attrs: SFCBlock['attrs'],
  langFallback?: string,
  forceLangFallback = false,
): string {
  let query = ''

  for (const name in attrs) {
    const value = attrs[name]
    if (!ignoreList.has(name)) {
      query += `&${encodeURIComponent(name)}${value ? `=${encodeURIComponent(value)}` : ''}`
    }
  }

  if (langFallback || attrs.lang) {
    query +=
      'lang' in attrs
        ? forceLangFallback
          ? `&lang.${langFallback}`
          : `&lang.${attrs.lang}`
        : `&lang.${langFallback}`
  }

  return query
}
