import express from 'express'
import { createBundleLoader } from 'visle'

import bundle from '../dist/server/visle-bundle.js'
import { app, render } from './app/server.ts'

render.setLoader(createBundleLoader(bundle))
app.use('/assets', express.static('dist/client/assets'))

app.listen(3000, () => {
  console.log('Server running at http://localhost:3000')
})
