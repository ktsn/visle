import express from 'express'
import path from 'node:path'
import app from './server-dist/server.js'

app.use(express.static(path.resolve(import.meta.dirname, 'client-dist')))

app.listen(5173, () => {
  console.log('Server is running on http://localhost:5173')
})
