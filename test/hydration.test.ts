import fs from 'node:fs/promises'
import http from 'node:http'
import path from 'node:path'

import { chromium, type Browser, type Page } from 'playwright'
import { describe, test, expect, beforeAll, afterAll } from 'vitest'

import { createTmpDir, copyFixtures, prodBuild, prodRender, normalizeHashes } from './utils.ts'

/**
 * Only pages that contain island components.
 */
const hydrationCases: { name: string; component: string; props?: Record<string, unknown> }[] = [
  { name: 'Island with props', component: 'with-island-props' },
  { name: 'Nested island', component: 'with-nested-island' },
  { name: 'Multiple islands on the same page', component: 'with-multiple-islands' },
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
      resolve({ server, port: (server.address() as { port: number }).port })
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
        let html = await render(component, props)

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
   * Opens a page, waits for island hydration to complete,
   * and collects any page errors.
   */
  async function openAndHydrate(
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

    await page.goto(`http://localhost:${port}/${component}.html`)
    await page.waitForFunction(() => customElements.get('vue-island') !== undefined)
    await page.waitForLoadState('networkidle')

    return { page, errors, warnings }
  }

  test.for(hydrationCases)('$name', async ({ component }) => {
    const { page, errors, warnings } = await openAndHydrate(component)

    const html = await page.innerHTML('body')
    expect(normalizeHashes(html)).toMatchSnapshot()
    expect(warnings).toEqual([])
    expect(errors).toEqual([])

    await page.close()
  })
})
