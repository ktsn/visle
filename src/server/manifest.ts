import fs from 'node:fs'
import path from 'node:path'

import { clientManifest, manifestFileName, type ManifestData } from '../build/client-manifest.js'

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
  const manifest = clientManifest({
    command: 'serve',
    isProduction: viteConfig.isProduction,
    root: viteConfig.root,
    base: viteConfig.base,
    server: viteConfig.server,
  })

  return {
    getClientImportId(componentRelativePath: string): string {
      const absPath = path.resolve(viteConfig.root, componentRelativePath)
      return manifest.getClientImportId(absPath)
    },

    getDependingClientCssIds(componentRelativePath: string): string[] {
      const absPath = path.resolve(viteConfig.root, componentRelativePath)
      const code = fs.readFileSync(absPath, 'utf-8')
      return manifest.getDependingClientCssIds(absPath, code)
    },
  }
}
