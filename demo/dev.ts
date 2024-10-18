import { createServer } from 'vite'
import { Express } from 'express'

const vite = await createServer({
  server: {
    middlewareMode: true,
  },
  appType: 'custom',
})

try {
  const app: Express = (await vite.ssrLoadModule('./src/server.ts')).default

  app.use(vite.middlewares)

  app.listen(5173, () => {
    console.log('Server running on http://localhost:5173')
  })
} catch (e) {
  vite.ssrFixStacktrace(e as Error)
  throw e
}
