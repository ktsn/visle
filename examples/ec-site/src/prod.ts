import { createStaticLoader } from 'visle'

import runtime from '../dist/server/visle-runtime.js'
import { app, render } from './app/server.ts'

render.setLoader(createStaticLoader(runtime))

export default app
