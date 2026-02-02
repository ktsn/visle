import assert from 'node:assert'
import path from 'node:path'
import { ResolvedServerOptions, ResolvedConfig as ResolvedViteConfig } from 'vite'
import { parse, SFCBlock } from 'vue/compiler-sfc'

import { generateComponentId } from './component-id.js'
import { virtualCustomElementEntryPath, customElementEntryPath } from './paths.js'

type ClientManifestViteConfig = Pick<
  ResolvedViteConfig,
  'command' | 'isProduction' | 'root' | 'base'
> & {
  server: ClientManifestViteServerOptions
}

type ClientManifestViteServerOptions = Pick<ResolvedServerOptions, 'origin'>

export interface StyleBuildData {
  cssMap: Map<string, string[]>
  entryCss: string[]
}

export interface IslandsBuildData {
  jsMap: Map<string, string>
}

export function clientManifest(manifestConfig: ClientManifestViteConfig) {
  const { root, base } = manifestConfig

  let cssMap: Map<string, string[]> | undefined
  let entryCss: string[] | undefined
  let jsMap: Map<string, string> | undefined

  function setStyleBuildData(data: StyleBuildData): void {
    cssMap = data.cssMap
    entryCss = data.entryCss
  }

  function setIslandsBuildData(data: IslandsBuildData): void {
    jsMap = data.jsMap
  }

  function ensureJsMap(): Map<string, string> {
    if (jsMap) {
      return jsMap
    }

    throw new Error(
      'Islands build data is not available. setIslandsBuildData() must be called before accessing JS mappings in build mode.',
    )
  }

  function ensureCssMap(): Map<string, string[]> {
    if (cssMap) {
      return cssMap
    }

    throw new Error(
      'Style build data is not available. setStyleBuildData() must be called before accessing CSS mappings in build mode.',
    )
  }

  function ensureEntryCss(): string[] {
    if (entryCss) {
      return entryCss
    }

    throw new Error(
      'Style build data is not available. setStyleBuildData() must be called before accessing entry CSS in build mode.',
    )
  }

  function getClientImportId(id: string): string {
    const relativePath = path.relative(root, id)

    if (manifestConfig.command === 'serve') {
      if (id === customElementEntryPath) {
        return applyServeBase(virtualCustomElementEntryPath)
      }

      return applyServeBase(`/${relativePath}`)
    }

    const js = ensureJsMap()
    const file = js.get(relativePath)
    if (!file) {
      throw new Error(`${relativePath} not found in islands build data`)
    }

    return applyBuildBase(`/${file}`)
  }

  function getDependingClientCssIds(id: string, code: string): string[] {
    const relativePath = path.relative(root, id)

    if (manifestConfig.command === 'serve') {
      if (!id.endsWith('vue')) {
        return []
      }

      const descriptor = parse(code).descriptor
      const componentId = generateComponentId(relativePath, code, manifestConfig.isProduction)

      return descriptor.styles.map((style, i) => {
        if (style.src) {
          throw new Error('<style src> is not supported')
        }

        const attrsQuery = attrsToQuery(style.attrs, 'css')
        const scopedQuery = style.scoped ? `&scoped=${componentId}` : ''
        const query = `?vue&type=style&index=${i}${scopedQuery}`

        let styleId = `/${relativePath}${query}${attrsQuery}`

        if (style.module) {
          // inject `.module` before extension so vite handles it as css module
          styleId = styleId.replace(/\.(\w+)$/, '.module.$1')
        }

        return applyServeBase(styleId)
      })
    }

    const css = ensureCssMap()
    const entry = ensureEntryCss()

    const cssIds = css.get(relativePath) ?? entry
    return cssIds.map((cssId) => applyBuildBase(`/${cssId}`))
  }

  /**
   * If specified, prepend path part of base to the filePath.
   * @param filePath Must be absolute path without an origin.
   */
  function applyServeBase(filePath: string): string {
    assert(manifestConfig.command === 'serve')

    // Normalize origin value
    const origin = manifestConfig.server.origin?.replace(/\/$/, '') ?? ''
    const basePath = basePathForDev(base)

    return `${origin}${basePath}${filePath}`
  }

  function applyBuildBase(filePath: string): string {
    assert(manifestConfig.command === 'build')

    const basePath = basePathForBuild(base)
    return `${basePath}${filePath}`
  }

  return {
    getClientImportId,
    getDependingClientCssIds,
    setStyleBuildData,
    setIslandsBuildData,
  }
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

function basePathForDev(base: string): string {
  const baseUrl = new URL(base, 'https://example.com')
  return baseUrl.pathname.replace(/\/$/, '')
}

function basePathForBuild(base: string): string {
  return base.replace(/\/$/, '')
}
