import { describe, expect, test, vi } from 'vitest'
import { resolveConfig, defaultConfig } from '../../src/build/config.ts'

describe('Config', () => {
  const mockCwd = '/mock/cwd'

  describe('resolveConfig', () => {
    test('returns default config when no config file exists', async () => {
      const result = await resolveConfig({
        cwd: mockCwd,
        loadConfig: vi.fn().mockRejectedValue(new Error('Not found')),
      })

      expect(result).toEqual(defaultConfig)
    })

    test('loads and merges config from visle.config.js', async () => {
      const userConfig = {
        componentDir: 'custom-components',
        clientOutDir: 'custom-client',
      }

      const mockLoadConfig = vi.fn().mockResolvedValue(userConfig)

      const result = await resolveConfig({
        cwd: mockCwd,
        loadConfig: mockLoadConfig,
      })

      expect(result).toEqual({
        ...defaultConfig,
        ...userConfig,
      })
      expect(mockLoadConfig).toHaveBeenCalledWith(`${mockCwd}/visle.config.js`)
    })

    test('makes relative root path absolute', async () => {
      const userConfig = {
        root: 'relative/path',
      }

      const mockLoadConfig = vi.fn().mockResolvedValue(userConfig)

      const result = await resolveConfig({
        cwd: mockCwd,
        loadConfig: mockLoadConfig,
      })

      expect(result.root).toBe(`${mockCwd}/relative/path`)
    })

    test('keeps absolute root path as is', async () => {
      const userConfig = {
        root: '/absolute/path',
      }

      const mockLoadConfig = vi.fn().mockResolvedValue(userConfig)

      const result = await resolveConfig({
        cwd: mockCwd,
        loadConfig: mockLoadConfig,
      })

      expect(result.root).toBe('/absolute/path')
    })

    test('preserves default values for unspecified properties', async () => {
      const userConfig = {
        root: 'custom-root',
        // componentDir and outDirs not specified
      }

      const mockLoadConfig = vi.fn().mockResolvedValue(userConfig)

      const result = await resolveConfig({
        cwd: mockCwd,
        loadConfig: mockLoadConfig,
      })

      expect(result).toEqual({
        root: `${mockCwd}/custom-root`, // Relative path made absolute
        componentDir: defaultConfig.componentDir,
        clientOutDir: defaultConfig.clientOutDir,
        serverOutDir: defaultConfig.serverOutDir,
      })
    })
  })
})
