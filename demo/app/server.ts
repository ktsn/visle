import express from 'express'
import { createRender } from 'visle'

const app = express()

const render = createRender()

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

export { app, render }
