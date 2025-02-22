import express from 'express'
import path from 'node:path'
import { createRender } from 'vue-islands-renderer'

const app = express()

const isDev = process.env.NODE_ENV !== 'production'

const render = createRender({
  isDev,
})

app.get('/', async (_req, res) => {
  const body = await render('Page', {
    title: 'Hello, Island!',
  })

  res.send(body)
})

app.get('/static', async (_req, res) => {
  const body = await render('Static')
  res.send(body)
})

app.listen(5173, () => {
  console.log('Server is running on http://localhost:5173')
})

if (isDev) {
  app.use(render.devMiddlewares)
} else {
  app.use(express.static(path.resolve('dist/client')))
}

export default app
