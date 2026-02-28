import { EventEmitter } from 'node:events'
import fs from 'node:fs/promises'

import type { ResolvedConfig, ViteDevServer } from 'vite'
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'

import { resolveServerComponentIds } from '../paths.ts'
import { entryTypesPlugin } from './entry-types.ts'

vi.mock('node:fs/promises', () => ({
  default: {
    writeFile: vi.fn(() => Promise.resolve()),
  },
}))

vi.mock('../paths.ts', () => ({
  resolveServerComponentIds: vi.fn(() => []),
}))

function createPlugin(dts: string | null = 'visle-generated.d.ts') {
  const { plugin, generate } = entryTypesPlugin({
    entryDir: 'pages',
    serverOutDir: 'dist/server',
    clientOutDir: 'dist/client',
    dts,
  })

  // Call configResolved to set up paths
  const hook = plugin.configResolved as ((config: ResolvedConfig) => void) | undefined
  hook?.({ root: '/project' } as ResolvedConfig)

  return { plugin, generate }
}

function createWatcher() {
  return new EventEmitter()
}

function createServer(watcher: EventEmitter) {
  return { watcher } as unknown as ViteDevServer
}

describe('entryTypesPlugin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('generates dts on server start', async () => {
    const { plugin } = createPlugin()
    const watcher = createWatcher()

    vi.mocked(resolveServerComponentIds).mockReturnValue(['/project/pages/Index.vue'])

    const hook = plugin.configureServer as (server: ViteDevServer) => Promise<void>
    await hook(createServer(watcher))

    expect(resolveServerComponentIds).toHaveBeenCalledWith('/project/pages')
    expect(fs.writeFile).toHaveBeenCalledWith(
      '/project/visle-generated.d.ts',
      expect.stringMatching('Index'),
    )
  })

  test('generates dts via generate() for build', async () => {
    const { generate } = createPlugin()

    vi.mocked(resolveServerComponentIds).mockReturnValue(['/project/pages/Index.vue'])

    await generate()

    expect(resolveServerComponentIds).toHaveBeenCalledWith('/project/pages')
    expect(fs.writeFile).toHaveBeenCalledWith(
      '/project/visle-generated.d.ts',
      expect.stringMatching('Index'),
    )
  })

  test('skips write when content has not changed', async () => {
    const { plugin } = createPlugin()
    const watcher = createWatcher()

    vi.mocked(resolveServerComponentIds).mockReturnValue(['/project/pages/New.vue'])

    const hook = plugin.configureServer as (server: ViteDevServer) => Promise<void>
    await hook(createServer(watcher))

    expect(fs.writeFile).toHaveBeenCalledTimes(1)

    // Trigger add event for a .vue file in entryRoot
    watcher.emit('add', '/project/pages/New.vue')
    await vi.advanceTimersByTimeAsync(100)

    // Content is the same, so no second write
    expect(fs.writeFile).toHaveBeenCalledTimes(1)
  })

  test('regenerates on add event for .vue files in entry directory', async () => {
    const { plugin } = createPlugin()
    const watcher = createWatcher()

    vi.mocked(resolveServerComponentIds)
      .mockReturnValueOnce(['/project/pages/Index.vue'])
      .mockReturnValueOnce(['/project/pages/Index.vue', '/project/pages/New.vue'])

    const hook = plugin.configureServer as (server: ViteDevServer) => Promise<void>
    await hook(createServer(watcher))

    expect(fs.writeFile).toHaveBeenCalledTimes(1)

    watcher.emit('add', '/project/pages/New.vue')
    await vi.advanceTimersByTimeAsync(100)

    expect(fs.writeFile).toHaveBeenCalledTimes(2)
    expect(fs.writeFile).toHaveBeenLastCalledWith(
      '/project/visle-generated.d.ts',
      expect.stringMatching('New'),
    )
  })

  test('regenerates on unlink event for .vue files in entry directory', async () => {
    const { plugin } = createPlugin()
    const watcher = createWatcher()

    vi.mocked(resolveServerComponentIds)
      .mockReturnValueOnce(['/project/pages/Index.vue', '/project/pages/Old.vue'])
      .mockReturnValueOnce(['/project/pages/Index.vue'])

    const hook = plugin.configureServer as (server: ViteDevServer) => Promise<void>
    await hook(createServer(watcher))

    watcher.emit('unlink', '/project/pages/Old.vue')
    await vi.advanceTimersByTimeAsync(100)

    expect(fs.writeFile).toHaveBeenCalledTimes(2)
  })

  test('debounces rapid events into a single write', async () => {
    const { plugin } = createPlugin()
    const watcher = createWatcher()

    vi.mocked(resolveServerComponentIds)
      .mockReturnValueOnce(['/project/pages/Index.vue', '/project/pages/Old.vue'])
      .mockReturnValueOnce(['/project/pages/Index.vue', '/project/pages/New.vue'])

    const hook = plugin.configureServer as (server: ViteDevServer) => Promise<void>
    await hook(createServer(watcher))

    // Simulate rename: unlink + add in quick succession
    watcher.emit('unlink', '/project/pages/Old.vue')
    watcher.emit('add', '/project/pages/New.vue')
    await vi.advanceTimersByTimeAsync(100)

    // Initial write + one debounced write
    expect(fs.writeFile).toHaveBeenCalledTimes(2)
  })

  test('ignores non-.vue files', async () => {
    const { plugin } = createPlugin()
    const watcher = createWatcher()

    vi.mocked(resolveServerComponentIds)
      .mockReturnValueOnce(['/project/pages/Index.vue'])
      .mockReturnValueOnce(['/project/pages/Index.vue'])

    const hook = plugin.configureServer as (server: ViteDevServer) => Promise<void>
    await hook(createServer(watcher))

    watcher.emit('add', '/project/pages/utils.ts')
    await vi.advanceTimersByTimeAsync(100)

    // Only the initial write
    expect(fs.writeFile).toHaveBeenCalledTimes(1)
  })

  test('ignores .vue files outside entry directory', async () => {
    const { plugin } = createPlugin()
    const watcher = createWatcher()

    vi.mocked(resolveServerComponentIds)
      .mockReturnValueOnce(['/project/pages/Index.vue'])
      .mockReturnValueOnce(['/project/pages/Index.vue'])

    const hook = plugin.configureServer as (server: ViteDevServer) => Promise<void>
    await hook(createServer(watcher))

    watcher.emit('add', '/project/components/Button.vue')
    await vi.advanceTimersByTimeAsync(100)

    // Only the initial write
    expect(fs.writeFile).toHaveBeenCalledTimes(1)
  })

  test('skips dts generation when dts is null', async () => {
    const { plugin, generate } = createPlugin(null)

    // generate() should be a no-op
    await generate()
    expect(fs.writeFile).not.toHaveBeenCalled()

    // configureServer hook should not exist
    expect(plugin.configureServer).toBeUndefined()
  })

  test('uses custom dts path', async () => {
    const { generate } = createPlugin('types/visle.d.ts')

    vi.mocked(resolveServerComponentIds).mockReturnValue(['/project/pages/Index.vue'])

    await generate()

    expect(fs.writeFile).toHaveBeenCalledWith(
      '/project/types/visle.d.ts',
      expect.stringMatching('Index'),
    )
  })
})
