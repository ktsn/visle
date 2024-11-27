import { Manifest } from 'vite'
import { parse, SFCBlock } from 'vue/compiler-sfc'
import path from 'node:path'
import baseFs from 'node:fs'
import { generateComponentId } from './component-id.js'

export const virtualCustomElementEntryPath = '/@vue-islands-renderer/entry'

export const customElementEntryPath = path.resolve(
  import.meta.dirname,
  '../client/custom-element.js',
)

export const entryMetadataPath = '.vite/entry-metadata.json'

interface ClientManifestConfig {
  manifest: string
  command: 'serve' | 'build'
  root: string
  isProduction: boolean
  clientDist: string
  fs?: ClientManifestFs
}

interface ClientManifestFs {
  readFileSync: typeof baseFs.readFileSync
}

export interface EntryMetadata {
  css: string[]
}

export function clientManifest(config: ClientManifestConfig) {
  const fs = config.fs || baseFs

  let clientManifest: Manifest
  let entryMetaData: EntryMetadata

  function ensureClientManifest(): Manifest {
    if (clientManifest) {
      return clientManifest
    }

    clientManifest = JSON.parse(
      fs.readFileSync(
        path.resolve(config.root, config.clientDist, config.manifest),
        'utf-8',
      ),
    )
    return clientManifest
  }

  function ensureEntryMetadata() {
    if (entryMetaData) {
      return entryMetaData
    }

    entryMetaData = JSON.parse(
      fs.readFileSync(
        path.resolve(config.root, config.clientDist, entryMetadataPath),
        'utf-8',
      ),
    )
    return entryMetaData
  }

  function getClientImportId(id: string): string {
    const relativePath = path.relative(config.root, id)

    if (config.command === 'serve') {
      if (id === customElementEntryPath) {
        return virtualCustomElementEntryPath
      }

      return `/${relativePath}`
    }

    const manifest = ensureClientManifest()
    const file = manifest[relativePath]?.file
    if (!file) {
      throw new Error(`${relativePath} not found in manifest`)
    }

    return `/${file}`
  }

  function getDependingClientCssIds(id: string, code: string): string[] {
    const relativePath = path.relative(config.root, id)

    if (config.command === 'serve') {
      if (!id.endsWith('vue')) {
        return []
      }

      const descriptor = parse(code).descriptor
      const componentId = generateComponentId(
        relativePath,
        code,
        config.isProduction,
      )

      return descriptor.styles.map((style, i) => {
        if (style.src) {
          throw new Error('<style src> is not supported')
        }

        if (style.module) {
          throw new Error('<style module> is not supported')
        }

        const attrsQuery = attrsToQuery(style.attrs, 'css')
        const scopedQuery = style.scoped ? `&scoped=${componentId}` : ''
        const query = `?vue&type=style&index=${i}${scopedQuery}`
        return `/${relativePath}${query}${attrsQuery}`
      })
    }

    const manifest = ensureClientManifest()
    const entry = ensureEntryMetadata()

    const cssIds = manifest[relativePath]?.css ?? entry.css
    return cssIds.map((cssId) => `/${cssId}`)
  }

  return {
    getClientImportId,
    getDependingClientCssIds,
  }
}

// these are built-in query parameters so should be ignored
// if the user happen to add them as attrs
const ignoreList = [
  'id',
  'index',
  'src',
  'type',
  'lang',
  'module',
  'scoped',
  'generic',
]

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
    if (!ignoreList.includes(name)) {
      query += `&${encodeURIComponent(name)}${
        value ? `=${encodeURIComponent(value)}` : ''
      }`
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
