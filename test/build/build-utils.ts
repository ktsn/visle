import path from 'node:path'
import fs from 'node:fs'
import { createServer } from 'vite'
import { islandPlugin } from '../../src/build/plugins/index.js'
import { fileURLToPath } from 'node:url'

const tmpDir = path.resolve('test/__generated__/build-utils')
const dirname = path.dirname(fileURLToPath(import.meta.url))
const renderModulePath = path.resolve(dirname, '../../src/server/render.ts')

export async function serveAndRenderMain(
  files: Record<string, string>,
): Promise<string> {
  fs.rmSync(tmpDir, { recursive: true, force: true })

  const main = `
  import { createRender } from '${renderModulePath}'
  const render = createRender({
    isDev: true,
    root: ${JSON.stringify(tmpDir)},
    componentDir: '',
  })
  export default () => render('main')
  `

  Object.entries({
    ...files,
    'main.js': main,
  }).map(([fileName, content]) => {
    const filePath = path.join(tmpDir, fileName)
    const dirPath = path.dirname(filePath)
    fs.mkdirSync(dirPath, { recursive: true })
    fs.writeFileSync(filePath, content)
  })

  const server = await createServer({
    server: {
      middlewareMode: true,
      ws: false,
    },
    logLevel: 'silent',
    appType: 'custom',
    root: tmpDir,

    plugins: [
      islandPlugin({
        clientDist: 'dist/client',
        componentDir: '',
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
