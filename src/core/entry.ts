import fs from 'node:fs'

import { type AbsolutePath, resolve } from './path.js'

/**
 * Path to client bootstrap script that the browser request to.
 */
export const virtualIslandsBootstrapPath = '/@visle/bootstrap'

/**
 * Resolves the path to the server dist directory
 */
export function resolveServerDistPath(serverOutDir: AbsolutePath): AbsolutePath {
  const mjsPath = resolve(serverOutDir, 'server-entry.mjs')
  const jsPath = resolve(serverOutDir, 'server-entry.js')

  if (fs.existsSync(mjsPath)) {
    return mjsPath
  }
  return jsPath
}
