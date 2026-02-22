import fs from 'node:fs'
import path from 'node:path'
import { parse, SFCBlock } from 'vue/compiler-sfc'

import { generateComponentId } from '../build/component-id.js'
import { manifestFileName, type ManifestData } from '../build/plugins/manifest.js'
import { virtualCustomElementEntryPath, customElementEntryPath } from '../build/paths.js'

export interface RuntimeManifest {
  getClientImportId(componentRelativePath: string): string
  getDependingClientCssIds(componentRelativePath: string): string[]
}

/**
 * Loads the manifest file from serverOutDir for production SSR.
 */
export function loadManifest(serverOutDir: string, base: string): RuntimeManifest {
  const manifestPath = path.join(serverOutDir, manifestFileName)
  const data: ManifestData = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))

  const basePath = base.replace(/\/$/, '')

  return {
    getClientImportId(componentRelativePath: string): string {
      const file = data.jsMap[componentRelativePath]
      if (!file) {
        throw new Error(`${componentRelativePath} not found in manifest JS map`)
      }
      return `${basePath}/${file}`
    },

    getDependingClientCssIds(componentRelativePath: string): string[] {
      const cssIds = data.cssMap[componentRelativePath] ?? data.entryCss
      return cssIds.map((cssId) => `${basePath}/${cssId}`)
    },
  }
}

/**
 * Creates a dev-mode RuntimeManifest that resolves paths using Vite's dev server.
 */
export function createDevManifest(viteConfig: {
  root: string
  base: string
  server: { origin?: string }
  isProduction: boolean
}): RuntimeManifest {
  const { root, base, isProduction } = viteConfig

  // Normalize origin value
  const origin = viteConfig.server.origin?.replace(/\/$/, '') ?? ''
  const basePath = basePathForDev(base)

  function applyServeBase(filePath: string): string {
    return `${origin}${basePath}${filePath}`
  }

  return {
    getClientImportId(componentRelativePath: string): string {
      const absPath = path.resolve(root, componentRelativePath)

      if (absPath === customElementEntryPath) {
        return applyServeBase(virtualCustomElementEntryPath)
      }

      return applyServeBase(`/${componentRelativePath}`)
    },

    getDependingClientCssIds(componentRelativePath: string): string[] {
      const absPath = path.resolve(root, componentRelativePath)

      if (!absPath.endsWith('vue')) {
        return []
      }

      const code = fs.readFileSync(absPath, 'utf-8')
      const descriptor = parse(code).descriptor
      const componentId = generateComponentId(componentRelativePath, code, isProduction)

      return descriptor.styles.map((style, i) => {
        if (style.src) {
          throw new Error('<style src> is not supported')
        }

        const attrsQuery = attrsToQuery(style.attrs, 'css')
        const scopedQuery = style.scoped ? `&scoped=${componentId}` : ''
        const query = `?vue&type=style&index=${i}${scopedQuery}`

        let styleId = `/${componentRelativePath}${query}${attrsQuery}`

        if (style.module) {
          // inject `.module` before extension so vite handles it as css module
          styleId = styleId.replace(/\.(\w+)$/, '.module.$1')
        }

        return applyServeBase(styleId)
      })
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
