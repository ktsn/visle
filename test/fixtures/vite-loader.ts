import { createRender } from 'visle'
import { createViteLoader } from 'visle/vite'

const render = createRender()
render.setLoader(createViteLoader())

console.log(await render('with-css'))
