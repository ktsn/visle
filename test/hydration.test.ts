import fs from 'node:fs/promises'
import http from 'node:http'
import path from 'node:path'

import { chromium, type Browser, type Page } from 'playwright'
import { describe, test, expect, beforeAll, afterAll } from 'vite-plus/test'

import { createTmpDir, copyFixtures, prodBuild, prodRender, normalizeHashes } from './utils.ts'

/**
 * Only pages that contain island components.
 */
const hydrationCases: { name: string; component: string; props?: Record<string, unknown> }[] = [
  { name: 'Island with props', component: 'with-island-props' },
  { name: 'Nested island', component: 'with-nested-island' },
  { name: 'Multiple islands on the same page', component: 'with-multiple-islands' },
  { name: 'Island with named import', component: 'with-named-import' },
  { name: 'Island with barrel import', component: 'with-barrel-import' },
  { name: 'SVG image asset', component: 'with-svg-img' },
  { name: 'Island with visible strategy', component: 'with-visible-island' },
  { name: 'Island with idle strategy', component: 'with-idle-island' },
  { name: 'Island with media strategy', component: 'with-media-island' },
]

/**
 * Minimal static file server for serving built assets.
 */
function startStaticServer(root: string): Promise<{ server: http.Server; port: number }> {
  return new Promise((resolve) => {
    const types: Record<string, string> = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.svg': 'image/svg+xml',
    }

    const server = http.createServer(async (req, res) => {
      const filePath = path.join(root, new URL(req.url!, 'http://localhost').pathname)
      try {
        const data = await fs.readFile(filePath)
        res.writeHead(200, {
          'Content-Type': types[path.extname(filePath)] || 'application/octet-stream',
        })
        res.end(data)
      } catch {
        res.writeHead(404)
        res.end()
      }
    })

    server.listen(0, () => {
      const addr = server.address()
      resolve({ server, port: typeof addr === 'object' && addr !== null ? addr.port : 0 })
    })
  })
}

describe('Client-side Hydration', () => {
  let port: number
  let server: http.Server
  let browser: Browser

  beforeAll(async () => {
    const root = await createTmpDir('e2e-client')
    await copyFixtures(root)
    await prodBuild(root)

    const render = prodRender(root)
    const clientDir = path.join(root, 'dist/client')

    // Render each page and write as HTML files for the browser
    await Promise.all(
      hydrationCases.map(async ({ component, props }) => {
        const html = await render(component, props)

        const filePath = path.join(clientDir, `${component}.html`)
        await fs.mkdir(path.dirname(filePath), { recursive: true })
        await fs.writeFile(filePath, html)
      }),
    )

    ;({ server, port } = await startStaticServer(clientDir))
    browser = await chromium.launch()
  }, 60_000)

  afterAll(async () => {
    await browser?.close()
    server?.close()
  })

  /**
   * Opens a page, waits for the custom element to be defined,
   * and collects any page errors.
   */
  async function openPage(
    component: string,
  ): Promise<{ page: Page; errors: string[]; warnings: string[] }> {
    const page = await browser.newPage()
    const errors: string[] = []
    const warnings: string[] = []

    page.on('pageerror', (err) => errors.push(err.message))
    page.on('console', (msg) => {
      if (msg.type() === 'warning') {
        warnings.push(msg.text())
      }
    })

    try {
      await page.goto(`http://localhost:${port}/${component}.html`)
      await page.waitForFunction(() => customElements.get('vue-island') !== undefined)
      await page.waitForLoadState('networkidle')
    } catch (e) {
      await page.close()
      throw e
    }

    return { page, errors, warnings }
  }

  test.for(hydrationCases)('$name', async ({ component }) => {
    const { page, errors, warnings } = await openPage(component)

    const html = await page.innerHTML('body')
    expect(normalizeHashes(html)).toMatchSnapshot()
    expect(warnings).toEqual([])
    expect(errors).toEqual([])

    await page.close()
  })

  test('visible strategy defers hydration until scrolled into view', async () => {
    const { page, warnings, errors } = await openPage('with-visible-island')

    // Island should not be hydrated yet (it's below the viewport)
    const isHydratedBefore = await page.evaluate(
      () => '_vnode' in document.querySelector('vue-island')!,
    )
    expect(isHydratedBefore).toBe(false)

    // Scroll to the bottom so the island enters the viewport
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForFunction(() => '_vnode' in document.querySelector('vue-island')!)

    expect(warnings).toEqual([])
    expect(errors).toEqual([])
    await page.close()
  })

  test('idle strategy hydrates when browser is idle', async () => {
    const { page, warnings, errors } = await openPage('with-idle-island')

    // The idle callback should fire quickly since there's nothing blocking the main thread
    await page.waitForFunction(() => '_vnode' in document.querySelector('vue-island')!)

    expect(warnings).toEqual([])
    expect(errors).toEqual([])
    await page.close()
  })

  test('media strategy defers hydration until media query matches', async () => {
    // Open page with a wide viewport (media query "(max-width: 768px)" won't match)
    const { page, warnings, errors } = await openPage('with-media-island')

    // Island should not be hydrated yet (viewport is wider than 768px)
    const isHydratedBefore = await page.evaluate(
      () => '_vnode' in document.querySelector('vue-island')!,
    )
    expect(isHydratedBefore).toBe(false)

    // Resize viewport to a narrow width so the media query matches
    await page.setViewportSize({ width: 500, height: 600 })
    await page.waitForFunction(() => '_vnode' in document.querySelector('vue-island')!)

    expect(warnings).toEqual([])
    expect(errors).toEqual([])
    await page.close()
  })
})
