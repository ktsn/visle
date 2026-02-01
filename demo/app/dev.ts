import { createDevLoader } from 'visle/dev'

import { app, render } from './server.ts'

const loader = createDevLoader()
render.setLoader(loader)

app.use(loader.middleware)

app.listen(5173, () => {
  console.log('Server is running in dev mode on http://localhost:5173')
})
