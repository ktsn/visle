import { Plugin } from 'vite'

import { type AbsolutePath, asAbs, resolve } from '../../core/path.js'
import { ResolvedVisleConfig } from '../config.js'
import { generateServerVirtualEntryCode, serverVirtualEntryId } from '../generate.js'
import {
  islandsBootstrapPath,
  virtualIslandsBootstrapPath,
  resolveServerComponentIds,
} from '../paths.js'

/**
 * Vite plugin that resolves and loads virtual entry modules
 * per environment (style, islands, server, dev client).
 */
export function virtualFilePlugin(config: ResolvedVisleConfig): Plugin {
  let entryRoot: AbsolutePath

  return {
    name: 'visle:virtual-file',

    configResolved(resolvedConfig) {
      entryRoot = resolve(asAbs(resolvedConfig.root), config.entryDir)
    },

    resolveId(id) {
      if (id === virtualIslandsBootstrapPath) {
        return islandsBootstrapPath
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
