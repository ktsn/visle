import { cac } from 'cac'
import { build } from './build/build.js'

const cli = cac('Vue Islands Renderer')

cli.command('build').action(async () => {
  await build()
})

cli.parse()
