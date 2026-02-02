import { describe, expect, test } from 'vitest'

import { clientManifest } from '../../src/build/client-manifest.ts'
import { customElementEntryPath, virtualCustomElementEntryPath } from '../../src/build/paths.ts'

describe('Client manifest', () => {
  describe('command == server', () => {
    test('get custom element entry path as virtual path', () => {
      const manifest = clientManifest({
        command: 'serve',
        isProduction: false,
        root: '/path/to/root',
        base: '/',
        server: {},
      })

      const result = manifest.getClientImportId(customElementEntryPath)

      expect(result).toBe(virtualCustomElementEntryPath)
    })

    test('get a relative path from the root directory', () => {
      const manifest = clientManifest({
        command: 'serve',
        isProduction: false,
        root: '/path/to/root',
        base: '/',
        server: {},
      })

      const result = manifest.getClientImportId('/path/to/root/src/foo.vue')

      expect(result).toBe('/src/foo.vue')
    })

    test('return empty id array for css without <style>', () => {
      const manifest = clientManifest({
        command: 'serve',
        isProduction: false,
        root: '/path/to/root',
        base: '/',
        server: {},
      })

      const result = manifest.getDependingClientCssIds(
        '/path/to/root/src/foo.vue',
        '<template><div></div></template>',
      )

      expect(result).toEqual([])
    })

    test('return ids for <style> blocks in code', () => {
      const manifest = clientManifest({
        command: 'serve',
        isProduction: false,
        root: '/path/to/root',
        base: '/',
        server: {},
      })

      const result = manifest.getDependingClientCssIds(
        '/path/to/root/src/foo.vue',
        '<template><div></div></template><style scoped>h1 { color: red; }</style>',
      )

      expect(result).toEqual(['/src/foo.vue?vue&type=style&index=0&scoped=6bf1c258&lang.css'])
    })

    test('return ids for <style> block as css module', () => {
      const manifest = clientManifest({
        command: 'serve',
        isProduction: false,
        root: '/path/to/root',
        base: '/',
        server: {},
      })

      const result = manifest.getDependingClientCssIds(
        '/path/to/root/src/foo.vue',
        '<template><div></div></template><style module>h1 { color: red; }</style>',
      )

      expect(result).toEqual(['/src/foo.vue?vue&type=style&index=0&lang.module.css'])
    })

    test('return url with path part of base', () => {
      const manifest = clientManifest({
        command: 'serve',
        isProduction: false,
        root: '/path/to/root',
        base: 'https://example.com/prefix',
        server: {},
      })

      const result = manifest.getClientImportId('/path/to/root/src/foo.vue')

      expect(result).toBe('/prefix/src/foo.vue')
    })

    test('return url with specified dev server origin', () => {
      const manifest = clientManifest({
        command: 'serve',
        isProduction: false,
        root: '/path/to/root',
        base: '/',
        server: {
          origin: 'http://localhost:3000',
        },
      })

      const result = manifest.getClientImportId('/path/to/root/src/foo.vue')

      expect(result).toBe('http://localhost:3000/src/foo.vue')
    })
  })

  describe('command == build', () => {
    test('get file path derived from islands build data', () => {
      const manifestInstance = clientManifest({
        command: 'build',
        isProduction: true,
        root: '/path/to/root',
        base: '/',
        server: {},
      })

      manifestInstance.setIslandsBuildData({
        jsMap: new Map([['src/foo.vue', 'foo-1234.js']]),
      })

      const result = manifestInstance.getClientImportId('/path/to/root/src/foo.vue')

      expect(result).toBe('/foo-1234.js')
    })

    test('throw error if islands build data does not include passed file path', () => {
      const manifestInstance = clientManifest({
        command: 'build',
        isProduction: true,
        root: '/path/to/root',
        base: '/',
        server: {},
      })

      manifestInstance.setIslandsBuildData({
        jsMap: new Map(),
      })

      expect(() => {
        manifestInstance.getClientImportId('/path/to/root/src/foo.vue')
      }).toThrow(new Error('src/foo.vue not found in islands build data'))
    })

    test('get depending css ids from style build data', () => {
      const manifestInstance = clientManifest({
        command: 'build',
        isProduction: true,
        root: '/path/to/root',
        base: '/',
        server: {},
      })

      manifestInstance.setStyleBuildData({
        cssMap: new Map([['src/foo.vue', ['foo-1234.css']]]),
        entryCss: [],
      })

      const result = manifestInstance.getDependingClientCssIds(
        '/path/to/root/src/foo.vue',
        '<template><div></div></template><style>h1 { color: red; }</style>',
      )

      expect(result).toEqual(['/foo-1234.css'])
    })

    test('return entry css id array when style build data does not have css paths', () => {
      const manifestInstance = clientManifest({
        command: 'build',
        isProduction: true,
        root: '/path/to/root',
        base: '/',
        server: {},
      })

      manifestInstance.setStyleBuildData({
        cssMap: new Map(),
        entryCss: ['entry-1234.css'],
      })

      const result = manifestInstance.getDependingClientCssIds(
        '/path/to/root/src/foo.vue',
        '<template><div></div></template>',
      )

      expect(result).toEqual(['/entry-1234.css'])
    })

    test.for([
      ['https://example.com/prefix', 'https://example.com/prefix/foo-1234.js'],
      ['/prefix', '/prefix/foo-1234.js'],
    ] as const)('prepend base to file path: %s', ([base, expected]) => {
      const manifestInstance = clientManifest({
        command: 'build',
        isProduction: true,
        root: '/path/to/root',
        base,
        server: {},
      })

      manifestInstance.setIslandsBuildData({
        jsMap: new Map([['src/foo.vue', 'foo-1234.js']]),
      })

      const result = manifestInstance.getClientImportId('/path/to/root/src/foo.vue')

      expect(result).toBe(expected)
    })
  })
})
