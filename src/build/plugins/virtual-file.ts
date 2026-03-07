import path from 'node:path'

import { Plugin } from 'vite'

import { ResolvedVisleConfig } from '../config.js'
import {
  generateServerVirtualEntryCode,
  serverVirtualEntryId,
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
      if (id === virtualCustomElementEntryPath) {
        return customElementEntryPath
      }

      if (id === serverVirtualEntryId) {
        return id
      }
    },

    load(id) {
      if (id === serverVirtualEntryId) {
        return generateServerVirtualEntryCode(entryRoot, resolveServerComponentIds(entryRoot))
      }

      return null
    },
  }
}
