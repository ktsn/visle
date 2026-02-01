import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer, ViteDevServer } from 'vite'

const tmpDir = path.resolve('test/__generated__/build-utils')
const dirname = path.dirname(fileURLToPath(import.meta.url))
const viteConfigPath = path.resolve(dirname, './vite.config.ts')
const renderModulePath = path.resolve(dirname, '../../src/server/render.ts')
const devLoaderModulePath = path.resolve(dirname, '../../src/server/dev.ts')

export function serve(files: Record<string, string> = {}): Promise<ViteDevServer> {
  fs.rmSync(tmpDir, { recursive: true, force: true })

  const main = `
  import { createRender } from '${renderModulePath}'
  import { createDevLoader } from '${devLoaderModulePath}'
  const render = createRender()
  render.setLoader(createDevLoader({
    configFile: '${viteConfigPath}',
  }))
  export default () => render('main')
  `

  Object.entries({
    ...files,
    'main.js': main,
  }).forEach(([fileName, content]) => {
    const filePath = path.join(tmpDir, fileName)
    const dirPath = path.dirname(filePath)
    fs.mkdirSync(dirPath, { recursive: true })
    fs.writeFileSync(filePath, content)
  })

  return createServer({
    configFile: viteConfigPath,
    server: {
      middlewareMode: true,
      ws: false,
    },
    logLevel: 'silent',
    appType: 'custom',
  })
}

export async function serveAndRenderMain(files: Record<string, string>): Promise<string> {
  const server = await serve(files)
  const render = (await server.ssrLoadModule('/main.js')).default

  return render()
}
