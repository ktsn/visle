import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { Plugin } from 'vite'

import { ResolvedVisleConfig } from '../config.js'
import {
  generateClientVirtualEntryCode,
  generateServerVirtualEntryCode,
  clientVirtualEntryId,
  serverVirtualEntryId,
  symbolCode,
  symbolImportId,
} from '../generate.js'
import {
  customElementEntryPath,
  virtualCustomElementEntryPath,
  resolveServerComponentIds,
} from '../paths.js'

/**
 * Vite plugin that resolves and loads virtual entry modules
 * per environment (style, islands, server, dev client).
 */
export function virtualFilePlugin(config: ResolvedVisleConfig): Plugin {
  let entryRoot: string

  return {
    name: 'visle:virtual-file',

    configResolved(resolvedConfig) {
      entryRoot = path.join(resolvedConfig.root, config.entryDir)
    },

    resolveId(id) {
      const virtuals = [
        clientVirtualEntryId,
        serverVirtualEntryId,
        virtualCustomElementEntryPath,
        symbolImportId,
      ]

      if (virtuals.includes(id)) {
        return id
      }
    },

    load(id) {
      if (id === symbolImportId) {
        return symbolCode
      }

      if (id === serverVirtualEntryId) {
        return generateServerVirtualEntryCode(entryRoot, resolveServerComponentIds(entryRoot))
      }

      if (id === clientVirtualEntryId) {
        return generateClientVirtualEntryCode(resolveServerComponentIds(entryRoot))
      }

      if (id === virtualCustomElementEntryPath) {
        return readFile(customElementEntryPath, 'utf-8')
      }

      return null
    },
  }
}
