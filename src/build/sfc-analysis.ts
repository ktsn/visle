import type { ObjectExpression } from '@babel/types'
import type { ElementNode, TemplateChildNode } from '@vue/compiler-core'
import { NodeTypes } from '@vue/compiler-core'
import { compileScript, type SFCDescriptor } from 'vue/compiler-sfc'

export interface ImportInfo {
  source: string
  importedName: string // 'default' for default imports, or the named export name
}

/**
 * Parses import declarations from <script setup> or <script>
 * to build a tag-name-to-import mapping.
 */
export function buildImportMap(descriptor: SFCDescriptor, id: string): Map<string, ImportInfo> {
  const map = new Map<string, ImportInfo>()

  if (descriptor.scriptSetup) {
    const { imports } = compileScript(descriptor, { id })

    if (imports) {
      for (const [name, binding] of Object.entries(imports)) {
        map.set(name, {
          source: binding.source,
          importedName: binding.imported,
        })
      }
    }

    return map
  }

  if (descriptor.script) {
    const compiled = compileScript(descriptor, { id })
    const body = compiled.scriptAst!

    // Step 1: Build importName → ImportInfo map from import declarations
    const importSources = new Map<string, ImportInfo>()
    for (const node of body) {
      if (node.type === 'ImportDeclaration') {
        const source = node.source.value
        if (typeof source === 'string') {
          for (const specifier of node.specifiers) {
            if (specifier.type === 'ImportDefaultSpecifier') {
              importSources.set(specifier.local.name, { source, importedName: 'default' })
            } else if (specifier.type === 'ImportSpecifier') {
              const imported = specifier.imported
              const importedName = imported.type === 'Identifier' ? imported.name : imported.value
              importSources.set(specifier.local.name, { source, importedName })
            }
          }
        }
      }
    }

    // Step 2: Find options object from export default
    // Supports: export default { ... } and export default fn({ ... })
    let optionsObject: ObjectExpression | undefined
    for (const node of body) {
      if (node.type === 'ExportDefaultDeclaration') {
        if (node.declaration.type === 'ObjectExpression') {
          // export default { ... }
          optionsObject = node.declaration
        } else if (
          node.declaration.type === 'CallExpression' &&
          node.declaration.arguments[0]?.type === 'ObjectExpression'
        ) {
          // export default defineComponent({ ... })
          optionsObject = node.declaration.arguments[0]
        }
      }
    }

    // Step 3: Extract components option to get tag name mappings
    const componentMap = new Map<string, string>() // tagName → importName
    if (optionsObject) {
      const componentsProp = optionsObject.properties.find(
        (p) =>
          p.type === 'ObjectProperty' &&
          ((p.key.type === 'Identifier' && p.key.name === 'components') ||
            (p.key.type === 'StringLiteral' && p.key.value === 'components')),
      )
      if (
        componentsProp?.type === 'ObjectProperty' &&
        componentsProp.value.type === 'ObjectExpression'
      ) {
        for (const prop of componentsProp.value.properties) {
          if (prop.type !== 'ObjectProperty' || prop.value.type !== 'Identifier') {
            continue
          }
          const keyName =
            prop.key.type === 'Identifier'
              ? prop.key.name
              : prop.key.type === 'StringLiteral'
                ? prop.key.value
                : undefined
          if (keyName) {
            componentMap.set(keyName, prop.value.name)
          }
        }
      }
    }

    // Step 4: Combine — use componentMap if available, otherwise fall back to import names
    if (componentMap.size > 0) {
      for (const [tagName, importName] of componentMap) {
        const info = importSources.get(importName)
        if (info) {
          map.set(tagName, info)
        }
      }
    } else {
      for (const [importName, info] of importSources) {
        map.set(importName, info)
      }
    }
  }

  return map
}

/**
 * Recursively finds elements with v-client:load directive.
 */
export function findVClientElements(children: TemplateChildNode[]): ElementNode[] {
  const results: ElementNode[] = []

  for (const child of children) {
    if (child.type !== NodeTypes.ELEMENT) {
      continue
    }

    const hasVClient = child.props.some(
      (prop) =>
        prop.type === NodeTypes.DIRECTIVE &&
        prop.name === 'client' &&
        prop.arg?.type === NodeTypes.SIMPLE_EXPRESSION &&
        (prop.arg.content === 'load' || prop.arg.content === 'visible'),
    )

    if (hasVClient) {
      results.push(child)
    }

    if (child.children.length > 0) {
      results.push(...findVClientElements(child.children))
    }
  }

  return results
}
