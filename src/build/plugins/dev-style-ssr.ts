/**
 * Borrowed from Nuxt
 * https://github.com/nuxt/nuxt/blob/b74d41e150f173ae613b17dfbc15ab6e890ca19d/packages/vite/src/plugins/dev-ssr-css.ts
 */

import type { Plugin } from 'vite'

import { isCSS } from '../../shared/module-id.js'
import { type AbsolutePath, asAbs } from '../../shared/path.js'

/**
 * Development-only plugin that removes server-rendered `<link>` style tags
 * when Vite's HMR injects the corresponding `<style>` tags,
 * preventing duplicate styles during development.
 */
export function devStyleSSRPlugin(): Plugin {
  let root: AbsolutePath

  return {
    name: 'visle:dev-style-ssr',
    apply: 'serve',
    enforce: 'post',

    configResolved(config) {
      root = asAbs(config.root)
    },

    transform(code, id) {
      if (!isCSS(id) || !code.includes('import.meta.hot')) {
        return
      }

      let moduleId = id
      if (moduleId.startsWith(root)) {
        moduleId = moduleId.slice(root.length)
      }

      // When dev `<style>` is injected, remove the `<link>` styles from manifest
      return `${code}\ndocument.querySelectorAll(\`link[href="${moduleId}"]\`).forEach(i=>i.remove())`
    },
  }
}
