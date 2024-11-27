import { describe, expect, test, vitest } from 'vitest'
import {
  clientManifest,
  customElementEntryPath,
  EntryMetadata,
  virtualCustomElementEntryPath,
} from '../../src/build/client-manifest.ts'
import { Manifest } from 'vite'

describe('Client manifest', () => {
  describe('command == server', () => {
    test('get custom element entry path as virtual path', () => {
      const manifest = clientManifest({
        manifest: '.vite/manifest.json',
        clientDist: 'dist-client',
        command: 'serve',
        root: '/path/to/root',
        isProduction: false,
      })

      const result = manifest.getClientImportId(customElementEntryPath)

      expect(result).toBe(virtualCustomElementEntryPath)
    })

    test('get a relative path from the root directory', () => {
      const manifest = clientManifest({
        manifest: '.vite/manifest.json',
        clientDist: 'dist-client',
        command: 'serve',
        root: '/path/to/root',
        isProduction: false,
      })

      const result = manifest.getClientImportId('/path/to/root/src/foo.vue')

      expect(result).toBe('/src/foo.vue')
    })

    test('return empty id array for css without <style>', () => {
      const manifest = clientManifest({
        manifest: '.vite/manifest.json',
        clientDist: 'dist-client',
        command: 'serve',
        root: '/path/to/root',
        isProduction: false,
      })

      const result = manifest.getDependingClientCssIds(
        '/path/to/root/src/foo.vue',
        '<template><div></div></template>',
      )

      expect(result).toEqual([])
    })

    test('return ids for <style> blocks in code', () => {
      const manifest = clientManifest({
        manifest: '.vite/manifest.json',
        clientDist: 'dist-client',
        command: 'serve',
        root: '/path/to/root',
        isProduction: false,
      })

      const result = manifest.getDependingClientCssIds(
        '/path/to/root/src/foo.vue',
        '<template><div></div></template><style scoped>h1 { color: red; }</style>',
      )

      expect(result).toEqual([
        '/src/foo.vue?vue&type=style&index=0&scoped=6bf1c258&lang.css',
      ])
    })
  })

  describe('command == build', () => {
    test('get file path derived from manifest', () => {
      const manifest: Manifest = {
        'src/foo.vue': {
          file: 'foo-1234.js',
        },
      }
      const readFileSync = vitest.fn().mockReturnValue(JSON.stringify(manifest))

      const manifestInstance = clientManifest({
        manifest: '.vite/manifest.json',
        clientDist: 'dist-client',
        command: 'build',
        root: '/path/to/root',
        isProduction: true,
        fs: { readFileSync },
      })

      const result = manifestInstance.getClientImportId(
        '/path/to/root/src/foo.vue',
      )

      expect(result).toBe('/foo-1234.js')
    })

    test('throw error if manifest does not include passed file path', () => {
      const manifest: Manifest = {}
      const readFileSync = vitest.fn().mockReturnValue(JSON.stringify(manifest))

      const manifestInstance = clientManifest({
        manifest: '.vite/manifest.json',
        clientDist: 'dist-client',
        command: 'build',
        root: '/path/to/root',
        isProduction: true,
        fs: { readFileSync },
      })

      expect(() => {
        manifestInstance.getClientImportId('/path/to/root/src/foo.vue')
      }).toThrow(new Error('src/foo.vue not found in manifest'))
    })

    test('get depending css ids from manifest', () => {
      const manifest: Manifest = {
        'src/foo.vue': {
          file: 'foo-1234.js',
          css: ['foo-1234.css'],
        },
      }
      const readFileSync = vitest.fn().mockReturnValue(JSON.stringify(manifest))

      const manifestInstance = clientManifest({
        manifest: '.vite/manifest.json',
        clientDist: 'dist-client',
        command: 'build',
        root: '/path/to/root',
        isProduction: true,
        fs: { readFileSync },
      })

      const result = manifestInstance.getDependingClientCssIds(
        '/path/to/root/src/foo.vue',
        '<template><div></div></template><style>h1 { color: red; }</style>',
      )

      expect(result).toEqual(['/foo-1234.css'])
    })

    test('return entry css id array when manifest does not have css paths', () => {
      const manifest: Manifest = {
        'src/foo.vue': {
          file: 'foo-1234.js',
        },
      }
      const entry: EntryMetadata = {
        css: ['entry-1234.css'],
      }
      const readFileSync = vitest.fn().mockImplementation((path) => {
        if (path === '/path/to/root/dist-client/.vite/manifest.json') {
          return JSON.stringify(manifest)
        }

        if (path === '/path/to/root/dist-client/.vite/entry-metadata.json') {
          return JSON.stringify(entry)
        }
      })

      const manifestInstance = clientManifest({
        manifest: '.vite/manifest.json',
        clientDist: 'dist-client',
        command: 'build',
        root: '/path/to/root',
        isProduction: true,
        fs: { readFileSync },
      })

      const result = manifestInstance.getDependingClientCssIds(
        '/path/to/root/src/foo.vue',
        '<template><div></div></template>',
      )

      expect(result).toEqual(['/entry-1234.css'])
    })
  })
})
