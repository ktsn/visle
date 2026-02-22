import type { Plugin } from 'vite'

import MagicString from 'magic-string'
import path from 'node:path'
import { parse } from 'vue/compiler-sfc'

interface VClientPluginResult {
  plugin: Plugin
  islandPaths: Set<string>
}

/**
 * Vite plugin that rewrites SFC templates containing `v-client:load` directives.
 * Processes `?original` files (the actual template source after island plugin wrapping)
 * to wrap components with island wrappers and collect island paths for the build.
 */
export function vClientPlugin(): VClientPluginResult {
  const islandPaths = new Set<string>()

  const plugin: Plugin = {
    name: 'visle:v-client',

    enforce: 'pre',

    transform(code, id) {
      const isServer = this.environment?.name === 'server'
      if (!isServer) {
        return null
      }

      // Parse the file path and query
      const questionIdx = id.indexOf('?')
      const filePath = questionIdx >= 0 ? id.slice(0, questionIdx) : id
      const queryString = questionIdx >= 0 ? id.slice(questionIdx + 1) : undefined

      if (!filePath.endsWith('.vue')) {
        return null
      }

      // Only process ?original files — these contain the actual template
      // that needs v-client:load rewriting. Non-query .vue files are
      // replaced entirely by the island plugin's generateServerComponentCode.
      if (queryString !== 'original') {
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

        // Add import for the island wrapper
        imports.push(`import ${wrapperName} from '${importSource}?island'`)

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
 * Rewrites an element with v-client:load by wrapping it
 * with an island wrapper component.
 */
function rewriteElement(s: MagicString, node: any, wrapperName: string): void {
  const start = node.loc.start.offset
  const end = node.loc.end.offset

  const originalSource = s.original.slice(start, end)

  // Build props string (excluding v-client:load)
  const propsStr = buildPropsString(node)

  const tag = node.tag as string

  // Build the inner content (the original component for SSR)
  let innerContent: string
  if (node.isSelfClosing) {
    innerContent = `<${tag}${propsStr} />`
  } else {
    // Extract children content from original source
    const childrenContent = extractChildrenContent(originalSource, tag)
    innerContent = `<${tag}${propsStr}>${childrenContent}</${tag}>`
  }

  // Build the wrapper
  const wrapped = `<${wrapperName}${propsStr}>${innerContent}</${wrapperName}>`

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
