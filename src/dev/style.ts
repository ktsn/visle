import fs from 'node:fs/promises'

import type { DevEnvironment, EnvironmentModuleNode, ViteDevServer } from 'vite'
import { parse, type SFCBlock } from 'vue/compiler-sfc'

import { hasEntryExt } from '../build/paths.js'
import { generateComponentId } from '../shared/component-id.js'
import { getVisleConfig } from '../shared/config.js'
import { isCSS } from '../shared/module-id.js'
import { asAbs, asRel, dirname, join, relative, resolve } from '../shared/path.js'

interface CollectDevEntryCssIdsOptions {
  onModule?: (module: EnvironmentModuleNode) => void
}

/**
 * Collects the CSS URLs for an entry from a populated server environment graph.
 * This runs in Vite's host process, never in the application runtime.
 */
export async function collectDevEntryCssIds(
  devServer: ViteDevServer,
  serverEnvironment: DevEnvironment,
  componentPath: string,
  options: CollectDevEntryCssIdsOptions = {},
): Promise<string[]> {
  const root = asAbs(devServer.config.root)
  const { entryDir, entryExt } = getVisleConfig(devServer.config)

  async function getComponentCssIds(componentRelativePath: string): Promise<string[]> {
    const absPath = resolve(root, componentRelativePath)

    if (!hasEntryExt(absPath, entryExt)) {
      return []
    }

    const code = await fs.readFile(absPath, 'utf-8')
    const descriptor = parse(code).descriptor
    const componentId = generateComponentId(componentRelativePath, code, false)

    return Promise.all(
      descriptor.styles.map(async (style, index) => {
        const attrsQuery = attrsToQuery(style.attrs, 'css')
        const srcQuery = style.src ? (style.scoped ? `&src=${componentId}` : '&src=true') : ''
        const scopedQuery = style.scoped ? `&scoped=${componentId}` : ''
        const query = `?vue&type=style&index=${index}${srcQuery}${scopedQuery}`

        let stylePath: string
        if (!style.src) {
          stylePath = `/${componentRelativePath}`
        } else if (style.src.startsWith('.')) {
          const componentDir = dirname(asRel(componentRelativePath))
          stylePath = '/' + join(componentDir, style.src)
        } else {
          const result = await serverEnvironment.pluginContainer.resolveId(style.src, absPath)
          const resolved = result?.id
          stylePath = resolved ? '/' + relative(root, asAbs(resolved)) : '/' + style.src
        }

        let styleId = `${stylePath}${query}${attrsQuery}`
        if (style.module) {
          // Inject `.module` before the language suffix so Vite handles CSS modules.
          styleId = styleId.replace(/\.(\w+)$/, '.module.$1')
        }

        return styleId
      }),
    )
  }

  let entryModule: EnvironmentModuleNode | undefined
  for (const extension of entryExt) {
    const candidate = `${entryDir}/${componentPath}${extension}`
    const candidateAbsolutePath = resolve(root, candidate)
    const module = serverEnvironment.moduleGraph.getModuleById(candidateAbsolutePath)
    if (module) {
      entryModule = module
      break
    }
  }

  if (!entryModule) {
    // Callers can request the manifest before rendering the entry.
    return getComponentCssIds(`${entryDir}/${componentPath}${entryExt[0]}`)
  }

  const discovered: ({ type: 'css'; id: string } | { type: 'sfc'; relativePath: string })[] = []
  const visited = new Set<string>()

  function walk(module: EnvironmentModuleNode): void {
    if (!module.id || visited.has(module.id)) {
      return
    }
    visited.add(module.id)
    options.onModule?.(module)

    if (hasEntryExt(module.id, entryExt)) {
      discovered.push({
        type: 'sfc',
        relativePath: relative(root, asAbs(module.id)),
      })
    } else if (!module.id.includes('?vue') && isCSS(module.id)) {
      discovered.push({
        type: 'css',
        id: '/' + relative(root, asAbs(module.id)),
      })
    }

    for (const imported of module.importedModules) {
      walk(imported)
    }
  }
  walk(entryModule)

  const cssIdArrays = await Promise.all(
    discovered.map((entry) =>
      entry.type === 'css' ? Promise.resolve([entry.id]) : getComponentCssIds(entry.relativePath),
    ),
  )
  return [...new Set(cssIdArrays.flat())]
}

const ignoredStyleAttributes = new Set([
  'id',
  'index',
  'src',
  'type',
  'lang',
  'module',
  'scoped',
  'generic',
])

/** Borrowed from @vitejs/plugin-vue. */
function attrsToQuery(
  attrs: SFCBlock['attrs'],
  langFallback?: string,
  forceLangFallback = false,
): string {
  let query = ''

  for (const name in attrs) {
    const value = attrs[name]
    if (!ignoredStyleAttributes.has(name)) {
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
