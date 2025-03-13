import path from 'node:path'
import { build as viteBuild } from 'vite'
import { customElementEntryPath, resolvePattern } from './paths.js'
import { clientVirtualEntryId, serverVirtualEntryId } from './generate.js'
import { islandPlugin } from './plugins/index.js'
import { defaultConfig } from './config.js'

/**
 * Build all Vue components matched with the config.
 * Build consistes of two parts: client and server.
 *
 * Client Build:
 * - Transform each island component into entry files
 *   that hydrates corresponding islands respectively.
 * - Generate client side entry file that activates
 *   `<vue-island>` custom element. It triggers island
 *   hydration with loading island component entry files
 *   stated earlier.
 * - Generate a virtual chunk that loads all server side
 *   components and generates a CSS file extracted from them.
 * - Generate a manifest file of the client build that
 *   will be used by the server build later.
 *
 * Server Build:
 * - Transform all Vue components into single server entry
 *   file. The server entry file re-exports all Vue components
 *   with export id derived from each component's path.
 *   e.g. `user/profile.vue` will be exported as `user_profile`.
 * - Inject `<vue-island>` custom element into the place that
 *   island components are used.
 * - Resolve asset (JavaScript, CSS) paths and inject them
 *   into each server-rendered HTML as `<script>`, `<link>`
 *   or an attribute of `<vue-island>`.
 */
export async function build(): Promise<void> {
  await buildForClient(defaultConfig)
  await buildForServer(defaultConfig)
}

async function buildForServer(config: {
  root: string
  componentDir: string
  clientOutDir: string
  serverOutDir: string
}): Promise<void> {
  await viteBuild({
    root: config.root,
    build: {
      ssr: true,
      outDir: config.serverOutDir,
      rollupOptions: {
        input: [serverVirtualEntryId],
      },
    },
    plugins: [
      islandPlugin({
        componentDir: config.componentDir,
        clientOutDir: config.clientOutDir,
      }),
    ],
  })
}

async function buildForClient(config: {
  root: string
  componentDir: string
  clientOutDir: string
}): Promise<void> {
  const root = path.resolve(config.root)
  const islandPaths = resolvePattern(
    '/**/*.island.vue',
    path.join(root, config.componentDir),
  )

  await viteBuild({
    root: config.root,
    build: {
      manifest: true,
      outDir: config.clientOutDir,
      rollupOptions: {
        input: [customElementEntryPath, clientVirtualEntryId, ...islandPaths],
        preserveEntrySignatures: 'allow-extension',
      },
    },
    plugins: [
      islandPlugin({
        componentDir: config.componentDir,
        clientOutDir: config.clientOutDir,
      }),
    ],
  })
}
