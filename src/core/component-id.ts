import crypto from 'node:crypto'

import { normalizePath } from './path.js'

/**
 * Borrowed from @vitejs/plugin-vue
 */
export function generateComponentId(
  filePath: string,
  source: string,
  isProduction: boolean,
): string {
  const normalizedPath = normalizePath(filePath)
  return getHash(normalizedPath + (isProduction ? source : ''))
}

function getHash(text: string): string {
  return crypto.hash('sha256', text, 'hex').substring(0, 8)
}
