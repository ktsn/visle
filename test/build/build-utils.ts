import path from 'node:path'
import fs from 'node:fs'
import { createServer } from 'vite'
import island from '../../src/build/index.ts'
import { fileURLToPath } from 'node:url'

const tmpDir = 'test/__generated__'
const dirname = path.dirname(fileURLToPath(import.meta.url))
const renderModulePath = path.resolve(dirname, '../../src/server/render.ts')

export async function serveAndRenderMain(
  files: Record<string, string>,
): Promise<string> {
  const main = `
  import { render } from '${renderModulePath}'
  import Component from './Main.vue'
  export default () => render(Component)
  `

  fs.mkdirSync(tmpDir, { recursive: true })

  Object.entries({
    ...files,
    'main.js': main,
  }).map(([fileName, content]) => {
    fs.writeFileSync(path.join(tmpDir, fileName), content)
  })

  const server = await createServer({
    server: {
      middlewareMode: true,
      ws: false,
    },
    appType: 'custom',
    root: tmpDir,

    plugins: [
      island({
        clientDist: 'client',
        serverDist: 'server',
      }),
    ],

    build: {
      ssr: 'main.js',
      rollupOptions: {
        input: 'main.js',
      },
    },
  })

  const render = (await server.ssrLoadModule('/main.js')).default

  return render()
}
