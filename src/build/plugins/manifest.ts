import path from 'node:path'

import { Plugin, ResolvedConfig } from 'vite'

import { clientVirtualEntryId } from '../generate.js'

export const manifestFileName = 'visle-manifest.json'

export interface ManifestData {
  cssMap: Record<string, string[]>
  entryCss: string[]
  jsMap: Record<string, string>
}

interface ManifestPluginResult {
  plugin: Plugin
  getManifestData(): ManifestData
}

/**
 * Vite plugin that collects CSS/JS manifest data during bundle generation.
 */
export function manifestPlugin(): ManifestPluginResult {
  let viteConfig: ResolvedConfig
  let cssMap: Map<string, string[]> | undefined
  let entryCss: string[] | undefined
  let jsMap: Map<string, string> | undefined

  const plugin: Plugin = {
    name: 'visle:manifest',

    sharedDuringBuild: true,

    configResolved(resolvedConfig) {
      viteConfig = resolvedConfig
    },

    generateBundle(_options, bundle) {
      const envName = this.environment?.name
      const root = viteConfig.root

      if (envName === 'style') {
        const envCssMap = new Map<string, string[]>()
        let envEntryCss: string[] = []

        for (const [key, chunk] of Object.entries(bundle)) {
          if (chunk.type !== 'chunk') {
            continue
          }

          if (chunk.facadeModuleId === clientVirtualEntryId) {
            envEntryCss = Array.from(chunk.viteMetadata?.importedCss ?? [])
            delete bundle[key]
            continue
          }

          if (chunk.facadeModuleId) {
            const relativePath = path.relative(root, chunk.facadeModuleId)
            envCssMap.set(relativePath, Array.from(chunk.viteMetadata?.importedCss ?? []))
          }
        }

        cssMap = envCssMap
        entryCss = envEntryCss
        return
      }

      if (envName === 'islands') {
        const envJsMap = new Map<string, string>()

        for (const [key, chunk] of Object.entries(bundle)) {
          // Since we generate all style files in style environment,
          // delete all css assets in islands environment
          if (
            chunk.type === 'asset' &&
            typeof chunk.fileName === 'string' &&
            chunk.fileName.endsWith('.css')
          ) {
            delete bundle[key]
            continue
          }

          if (chunk.type !== 'chunk') {
            continue
          }

          if (chunk.facadeModuleId) {
            const relativePath = path.relative(root, chunk.facadeModuleId)
            envJsMap.set(relativePath, chunk.fileName)
          }
        }

        jsMap = envJsMap
      }
    },
  }

  return {
    plugin,

    getManifestData(): ManifestData {
      return {
        cssMap: Object.fromEntries(cssMap ?? new Map()),
        entryCss: entryCss ?? [],
        jsMap: Object.fromEntries(jsMap ?? new Map()),
      }
    },
  }
}
