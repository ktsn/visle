import express from 'express'
import path from 'node:path'
import { createRender } from 'visle'
import { createDevLoader } from 'visle/dev'

const app = express()

const isDev = process.env.NODE_ENV !== 'production'

const renderOptions = {
  componentDir: 'components',
}

const render = createRender(renderOptions)

if (isDev) {
  const loader = createDevLoader()
  render.setLoader(loader)
  app.use(loader.middleware)
} else {
  app.use(express.static(path.resolve('dist/client')))
}

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

export default app
