import { getRequestListener } from '@hono/node-server'
import http from 'node:http'
import { createDevLoader } from 'visle/dev'

import { app, render } from './server.ts'

const loader = createDevLoader()
render.setLoader(loader)

const requestListener = getRequestListener(app.fetch)

const server = http.createServer((req, res) => {
  loader.middleware(req, res, () => {
    requestListener(req, res)
  })
})

server.listen(3000, () => {
  console.log('Dev server running at http://localhost:3000')
})
