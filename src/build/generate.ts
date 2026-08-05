import { virtualIslandsBootstrapPath } from '../shared/entry.js'
import { manifestFileName } from '../shared/manifest.js'
import type { BuildManifest } from '../shared/manifest.js'
import { type AbsolutePath, type RelativePath, relative } from '../shared/path.js'
import { stripEntryExt } from './paths.js'

export const viteEntriesId = 'virtual:visle/vite-entries'
export const resolvedViteEntriesId = `\0${viteEntriesId}`
export const viteManifestId = 'virtual:visle/vite-manifest'
export const resolvedViteManifestId = `\0${viteManifestId}`
export const viteEntryCssPrefix = 'virtual:visle/vite-entry-css/'
export const resolvedViteEntryCssPrefix = `\0${viteEntryCssPrefix}`
export const serverEntriesId = 'virtual:visle/server-entries'
export const resolvedServerEntriesId = `\0${serverEntriesId}`

export const serverEntryFileName = 'server-entry.js'
export const bundleFileName = 'visle-bundle.js'
export const bundleDeclarationFileName = 'visle-bundle.d.ts'

export const componentWrapPrefix = '\0visle:wrap:'

export function generateServerVirtualEntryCode(
  entryDir: AbsolutePath,
  componentIds: AbsolutePath[],
  entryExt: string[],
  dynamic: boolean,
): string {
  const imports = componentIds
    .map((id, i) => {
      return dynamic
        ? `const _${i} = () => import(${JSON.stringify(id)}).then(({ default: component }) => component)`
        : `import _value_${i} from ${JSON.stringify(id)}\nconst _${i} = () => _value_${i}`
    })
    .join('\n')

  const entries = componentIds
    .map((id, i) => {
      const key = stripEntryExt(relative(entryDir, id), entryExt)
      return `  ${JSON.stringify(key)}: _${i}`
    })
    .join(',\n')

  return `${imports}\nexport default {\n${entries}\n}`
}

/**
 * Generate the production bundle module. The relative import is deliberately
 * static so deployment bundlers can discover every server entry.
 */
export function generateBundleCode(): string {
  const importPath = `./${serverEntryFileName}`
  const manifestImportPath = `./${manifestFileName}`

  return `import entries from ${JSON.stringify(importPath)}
import manifest from ${JSON.stringify(manifestImportPath)} with { type: "json" }

export default {
  entries,
  manifest,
}
`
}

export function generateBundleDeclarationCode(): string {
  return `import type { LoaderSource } from 'visle'

declare const bundle: LoaderSource

export default bundle
`
}

/** Generate production manifest data for the Vite-backed server loader. */
export function generateIntegratedManifestCode(manifest: BuildManifest): string {
  return `export default ${JSON.stringify(manifest)}\n`
}

/** Generate a development manifest with lazy per-entry CSS resolution. */
export function generateIntegratedDevManifestCode(
  base: string,
  entryDir: string,
  entryExt: string[],
  entries: Record<string, string>,
): string {
  const cssMap = Object.entries(entries)
    .map(([entryRelativePath, componentPath]) => {
      const cssModuleId = viteEntryCssPrefix + encodeURIComponent(componentPath)
      return `    ${JSON.stringify(entryRelativePath)}: () => import(${JSON.stringify(cssModuleId)}).then(({ default: cssIds }) => cssIds)`
    })
    .join(',\n')

  return `const jsMap = new Proxy(Object.create(null), {
  get(_target, relativePath) {
    return typeof relativePath === 'string' ? relativePath : undefined
  },
})

export default {
  base: ${JSON.stringify(base)},
  entryDir: ${JSON.stringify(entryDir)},
  entryExt: ${JSON.stringify(entryExt)},
  cssMap: {
${cssMap}
  },
  jsMap,
  islandsBootstrap: ${JSON.stringify(virtualIslandsBootstrapPath)},
}
`
}

export function generateComponentWrapperCode(
  filePath: AbsolutePath,
  componentRelativePath: RelativePath,
  importedNames: string[],
): string {
  const serializedFilePath = JSON.stringify(filePath)
  const serializedRelativePath = JSON.stringify(componentRelativePath)

  const lines = [
    `import { createComponentWrapper } from 'visle/internal'`,
    `export * from ${serializedFilePath}`,
  ]

  if (importedNames.length > 0) {
    const specifiers = importedNames.map((name, i) => `${name} as __visle_${i}`).join(', ')
    lines.push(`import { ${specifiers} } from ${serializedFilePath}`)

    for (const [i, name] of importedNames.entries()) {
      lines.push(
        name === 'default'
          ? `export default createComponentWrapper(${serializedRelativePath}, ${JSON.stringify(name)}, __visle_${i})`
          : `export const ${name} = createComponentWrapper(${serializedRelativePath}, ${JSON.stringify(name)}, __visle_${i})`,
      )
    }
  }

  return lines.join('\n') + '\n'
}

/**
 * Generate d.ts content to annotate Visle's `render` function
 * with the entry components and their props types.
 *
 * @param entryDir Entry components directory (VisleConfig#entryDir)
 * @param dtsDir Output directory of the d.ts file (dirname of VisleConfig#dts)
 * @param componentIds All entry component file paths
 * @returns Generated d.ts content
 */
export function generateEntryTypesCode(
  entryDir: AbsolutePath,
  dtsDir: AbsolutePath,
  componentIds: AbsolutePath[],
  entryExt: string[],
): string {
  const entries = componentIds
    .map((id) => {
      const key = stripEntryExt(relative(entryDir, id), entryExt)
      const importPath = relative(dtsDir, id)
      const importSpecifier = importPath.startsWith('.') ? importPath : `./${importPath}`
      return `    '${key}': ComponentProps<typeof import('${importSpecifier}')['default']>`
    })
    .join('\n')

  return `/* eslint-disable */
// oxlint-disable
// Generated by Visle. !! DO NOT MODIFY THIS FILE !!
// Make sure to add this file to your tsconfig.json file as an "include" or "files" entry.

declare module 'visle' {
  import type { ComponentProps } from 'visle'

  interface VisleEntries {
${entries}
  }
}
export {}
`
}
