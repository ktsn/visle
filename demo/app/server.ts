import express from 'express'
import { createRender } from 'vue-islands-renderer/server'

const app = express()

const render = createRender({
  isDev: process.env.NODE_ENV !== 'production',
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

app.use(render.devMiddlewares)

export default app
