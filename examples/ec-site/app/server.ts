import { Hono } from 'hono'
import { createRender } from 'visle'

import { getAllProducts, getProduct } from './db.ts'

const app = new Hono()
const render = createRender()

app.get('/', async (c) => {
  const products = getAllProducts()
  const html = await render('pages/index', { products })
  return c.html(html)
})

app.get('/products/:id', async (c) => {
  const product = getProduct(c.req.param('id'))
  if (!product) {
    return c.text('Not found', 404)
  }
  const html = await render('pages/detail', { product })
  return c.html(html)
})

export { app, render }
