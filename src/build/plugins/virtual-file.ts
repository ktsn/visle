import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { Plugin, ResolvedConfig } from 'vite'

import { ResolvedVisleConfig } from '../config.js'
import {
  generateClientVirtualEntryCode,
  generateServerVirtualEntryCode,
  clientVirtualEntryId,
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
  let viteConfig: ResolvedConfig

  return {
    name: 'visle:virtual-file',

    configResolved(resolvedConfig) {
      viteConfig = resolvedConfig
    },

    resolveId(id) {
      if (id === clientVirtualEntryId) {
        return clientVirtualEntryId
      }

      if (id === virtualCustomElementEntryPath) {
        return virtualCustomElementEntryPath
      }

      if (id === serverVirtualEntryId) {
        return serverVirtualEntryId
      }
    },

    load(id) {
      if (id === serverVirtualEntryId) {
        return generateServerVirtualEntryCode(
          path.join(viteConfig.root, config.entryDir),
          resolveServerComponentIds(path.join(viteConfig.root, config.entryDir)),
        )
      }

      if (id === clientVirtualEntryId) {
        return generateClientVirtualEntryCode(
          resolveServerComponentIds(path.join(viteConfig.root, config.entryDir)),
        )
      }

      if (id === virtualCustomElementEntryPath) {
        return readFile(customElementEntryPath, 'utf-8')
      }

      return null
    },
  }
}
