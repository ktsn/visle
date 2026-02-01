import express from 'express'
import * as path from 'node:path'

import { app } from './server.ts'

app.use(express.static(path.resolve('dist/client')))

app.listen(5173, () => {
  console.log('Server is running on http://localhost:5173')
})
