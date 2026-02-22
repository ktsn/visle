import path from 'node:path'

import MagicString from 'magic-string'
import type { Plugin } from 'vite'
import { parse } from 'vue/compiler-sfc'

import { islandWrapId, serverWrapPrefix, islandWrapPrefix } from '../generate.js'
import { parseId } from '../paths.js'

interface ServerTransformPluginResult {
  plugin: Plugin
  islandPaths: Set<string>
}

function toAbsolutePath(fileName: string, importer: string | undefined): string {
  if (path.isAbsolute(fileName)) {
    return fileName
  }
  if (importer) {
    const importerFileName = parseId(importer).fileName
    return path.resolve(path.dirname(importerFileName), fileName)
  }
  return path.resolve(fileName)
}

/**
 * Vite plugin that transforms Vue SFC imports on the server environment.
 * - Redirects `.vue` imports to server component wrapper virtual modules
 * - Rewrites SFC templates containing `v-client:load` directives
 *   to replace components with island wrappers
 * - Collects island component paths for the islands build
 */
export function serverTransformPlugin(): ServerTransformPluginResult {
  const islandPaths = new Set<string>()

  const plugin: Plugin = {
    name: 'visle:server-transform',

    enforce: 'pre',

    applyToEnvironment(environment) {
      return environment.name === 'server'
    },

    resolveId(id, importer) {
      // Skip island wrapper imports — handled by the island plugin
      if (id.startsWith(islandWrapId)) {
        return
      }

      // Redirect .vue imports to server wrapper virtual modules.
      // Skip when the importer is a wrapper module to avoid infinite recursion.
      const { fileName, query } = parseId(id)

      if (fileName.endsWith('.vue') && !query.vue) {
        const isFromWrapper =
          importer?.startsWith(serverWrapPrefix) || importer?.startsWith(islandWrapPrefix)
        if (!isFromWrapper) {
          const absolutePath = toAbsolutePath(fileName, importer)
          return serverWrapPrefix + absolutePath
        }
      }
    },

    transform(code, id) {
      // Parse the file path and query
      const questionIdx = id.indexOf('?')
      const filePath = questionIdx >= 0 ? id.slice(0, questionIdx) : id

      if (!filePath.endsWith('.vue')) {
        return null
      }

      // Skip sub-requests (e.g., ?vue&type=style) — only process plain .vue files
      if (questionIdx >= 0) {
        return null
      }

      const { descriptor } = parse(code)

      if (!descriptor.template?.ast) {
        return null
      }

      // Build tag-name-to-import-source map from <script setup>
      const importMap = buildImportMap(descriptor.scriptSetup?.content ?? '')

      // Find elements with v-client:load
      const matches = findVClientElements(descriptor.template.ast.children)

      if (matches.length === 0) {
        return null
      }

      const s = new MagicString(code)
      const imports: string[] = []

      for (let i = 0; i < matches.length; i++) {
        const node = matches[i]!
        const tag = node.tag as string
        const wrapperName = `VisleIsland${i}`

        // Check if this is a statically imported component
        const importSource = importMap.get(tag)
        if (!importSource) {
          console.warn(
            `[visle] v-client:load on "${tag}" is not supported. ` +
              'Only statically imported Vue components are supported.',
          )
          continue
        }

        // Resolve the absolute path of the component and collect for islands build
        const resolvedPath = path.resolve(path.dirname(filePath), importSource)
        islandPaths.add(resolvedPath)

        // Add import for the island wrapper virtual module
        imports.push(`import ${wrapperName} from '${islandWrapId}${resolvedPath}'`)

        // Rewrite the element in the template
        rewriteElement(s, node, wrapperName)
      }

      // Inject imports into <script setup> right after the opening tag
      if (imports.length > 0 && descriptor.scriptSetup) {
        const contentStart = descriptor.scriptSetup.loc.start.offset
        s.appendRight(contentStart, '\n' + imports.join('\n'))
      }

      return {
        code: s.toString(),
        map: s.generateMap({ hires: true }),
      }
    },
  }

  return { plugin, islandPaths }
}

/**
 * Parses import declarations from <script setup> content
 * to build a tag-name-to-import-source mapping.
 */
function buildImportMap(scriptContent: string): Map<string, string> {
  const map = new Map<string, string>()

  // Match: import Name from 'source'
  const importRegex = /import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g
  let match

  while ((match = importRegex.exec(scriptContent)) !== null) {
    const name = match[1]!
    const source = match[2]!

    // Only map .vue imports
    if (source.endsWith('.vue')) {
      map.set(name, source)
    }
  }

  return map
}

/**
 * Recursively finds elements with v-client:load directive.
 */
function findVClientElements(children: any[]): any[] {
  const results: any[] = []

  for (const child of children) {
    // NodeTypes.ELEMENT === 1
    if (child.type !== 1) {
      continue
    }

    const hasVClient = child.props.some(
      (prop: any) =>
        // NodeTypes.DIRECTIVE === 7
        prop.type === 7 &&
        prop.name === 'client' &&
        prop.arg?.type === 4 &&
        prop.arg?.content === 'load',
    )

    if (hasVClient) {
      results.push(child)
    }

    // Recurse into children
    if (child.children && child.children.length > 0) {
      results.push(...findVClientElements(child.children))
    }
  }

  return results
}

/**
 * Rewrites an element with v-client:load by replacing it
 * with the island wrapper component. The wrapper imports the original
 * component internally and renders it inside <vue-island>.
 * Child content (slots) is preserved and passed through.
 */
function rewriteElement(s: MagicString, node: any, wrapperName: string): void {
  const start = node.loc.start.offset
  const end = node.loc.end.offset

  const originalSource = s.original.slice(start, end)

  // Build props string (excluding v-client:load)
  const propsStr = buildPropsString(node)

  const tag = node.tag as string

  let wrapped: string
  if (node.isSelfClosing) {
    wrapped = `<${wrapperName}${propsStr} />`
  } else {
    const childrenContent = extractChildrenContent(originalSource, tag)
    wrapped = `<${wrapperName}${propsStr}>${childrenContent}</${wrapperName}>`
  }

  s.overwrite(start, end, wrapped)
}

/**
 * Builds a props string from element props, excluding v-client:load.
 */
function buildPropsString(node: any): string {
  const props: string[] = []

  for (const prop of node.props) {
    // Skip v-client:load directive
    if (prop.type === 7 && prop.name === 'client') {
      continue
    }

    props.push(prop.loc.source)
  }

  if (props.length === 0) {
    return ''
  }

  return ' ' + props.join(' ')
}

/**
 * Extracts the children content from an element's source string.
 */
function extractChildrenContent(source: string, tag: string): string {
  // Find the end of the opening tag
  const openTagEnd = findOpenTagEnd(source)
  // Find the start of the closing tag
  const closeTagStart = source.lastIndexOf(`</${tag}`)

  if (openTagEnd === -1 || closeTagStart === -1) {
    return ''
  }

  return source.slice(openTagEnd, closeTagStart)
}

/**
 * Finds the end position of the opening tag (after the `>`).
 */
function findOpenTagEnd(source: string): number {
  let inQuote: string | null = null

  for (let i = 0; i < source.length; i++) {
    const char = source[i]!

    if (inQuote) {
      if (char === inQuote) {
        inQuote = null
      }
      continue
    }

    if (char === '"' || char === "'") {
      inQuote = char
      continue
    }

    if (char === '>') {
      return i + 1
    }
  }

  return -1
}
