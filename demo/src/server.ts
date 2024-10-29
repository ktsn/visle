import express from 'express'
import { render } from '@ktsn/vue-island/server'
import Page from './components/Page.vue'
import Static from './components/Static.vue'

const app = express()

app.get('/', async (_req, res) => {
  const body = await render(Page, {
    title: 'Hello, Island!',
  })

  res.send(body)
})

app.get('/static', async (_req, res) => {
  const body = await render(Static)
  res.send(body)
})

export default app
