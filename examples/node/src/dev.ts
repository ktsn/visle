import { createDevLoader } from 'visle/dev'

import { app, render } from './app/server.ts'

const loader = createDevLoader()

render.setLoader(loader)
app.use(loader.middleware)

app.listen(3000, () => {
  console.log('Dev server running at http://localhost:3000')
})
