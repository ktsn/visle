import express from 'express'
import { createRender } from 'visle'

const app = express()
const render = createRender()

app.get('/', async (_request, response) => {
  const html = await render('index', { title: 'Visle on Node.js' })
  response.send(html)
})

export { app, render }
