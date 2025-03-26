import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest'
import {
  resolveConfig,
  defaultConfig,
  loadTypeScriptConfig,
} from '../../src/build/config.ts'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

describe('Config', () => {
  const mockCwd = '/mock/cwd'
  const dummyConfigPath = path.join(__dirname, 'temp-visle.config.ts')

  // Use vi.fn() for function mocks
  const mockLoadJsConfig = vi.fn()
  const mockLoadTsConfig = vi.fn()

  beforeEach(() => {
    vi.resetAllMocks()
  })

  afterEach(() => {
    // Clean up any test files
    if (fs.existsSync(dummyConfigPath)) {
      fs.unlinkSync(dummyConfigPath)
    }
  })

  describe('loadTypeScriptConfig', () => {
    test('throws error if file does not exist', async () => {
      const nonExistentPath = path.join(__dirname, 'non-existent-config.ts')
      await expect(loadTypeScriptConfig(nonExistentPath)).rejects.toThrow(
        'TypeScript config file not found',
      )
    })

    test('compiles TypeScript and imports the result', async () => {
      // Create a test TypeScript config file
      const tsConfig = `
        import { defineConfig } from '../../src/build/config'

        export default defineConfig({
          componentDir: 'ts-components',
          clientOutDir: 'test-client-dir'
        })
      `
      fs.writeFileSync(dummyConfigPath, tsConfig)

      // Test loading the actual file
      const result = await loadTypeScriptConfig(dummyConfigPath)

      expect(result).toEqual({
        componentDir: 'ts-components',
        clientOutDir: 'test-client-dir',
      })
    })
  })

  describe('resolveConfig', () => {
    test('returns default config when no config files exist', async () => {
      mockLoadTsConfig.mockRejectedValue(new Error('TS config not found'))
      mockLoadJsConfig.mockRejectedValue(new Error('JS config not found'))

      const result = await resolveConfig({
        cwd: mockCwd,
        loadJsConfig: mockLoadJsConfig,
        loadTsConfig: mockLoadTsConfig,
      })

      expect(result).toEqual(defaultConfig)
      expect(mockLoadTsConfig).toHaveBeenCalledWith(
        `${mockCwd}/visle.config.ts`,
      )
      expect(mockLoadJsConfig).toHaveBeenCalledWith(
        `${mockCwd}/visle.config.js`,
      )
    })

    test('prioritizes TypeScript config over JavaScript config', async () => {
      const tsConfig = { componentDir: 'from-typescript' }
      const jsConfig = { componentDir: 'from-javascript' }

      mockLoadTsConfig.mockResolvedValue(tsConfig)
      mockLoadJsConfig.mockResolvedValue(jsConfig)

      const result = await resolveConfig({
        cwd: mockCwd,
        loadJsConfig: mockLoadJsConfig,
        loadTsConfig: mockLoadTsConfig,
      })

      expect(result.componentDir).toBe('from-typescript')
      expect(mockLoadTsConfig).toHaveBeenCalled()
      expect(mockLoadJsConfig).not.toHaveBeenCalled()
    })

    test('falls back to JavaScript config if TypeScript config fails', async () => {
      const jsConfig = { componentDir: 'from-javascript' }

      // Mock TS config loader to fail
      mockLoadTsConfig.mockRejectedValue(new Error('TS config not found'))
      // Mock JS config loader to succeed
      mockLoadJsConfig.mockResolvedValue(jsConfig)

      const result = await resolveConfig({
        cwd: mockCwd,
        loadJsConfig: mockLoadJsConfig,
        loadTsConfig: mockLoadTsConfig,
      })

      expect(result.componentDir).toBe('from-javascript')
      expect(mockLoadTsConfig).toHaveBeenCalled()
      expect(mockLoadJsConfig).toHaveBeenCalled()
    })

    test('makes relative root path absolute in TypeScript config', async () => {
      const userConfig = {
        root: 'relative/path',
      }

      mockLoadTsConfig.mockResolvedValue(userConfig)

      const result = await resolveConfig({
        cwd: mockCwd,
        loadTsConfig: mockLoadTsConfig,
      })

      expect(result.root).toBe(`${mockCwd}/relative/path`)
    })

    test('keeps absolute root path as is in TypeScript config', async () => {
      const userConfig = {
        root: '/absolute/path',
      }

      mockLoadTsConfig.mockResolvedValue(userConfig)

      const result = await resolveConfig({
        cwd: mockCwd,
        loadTsConfig: mockLoadTsConfig,
      })

      expect(result.root).toBe('/absolute/path')
    })

    test('preserves default values for unspecified properties in JavaScript config', async () => {
      const userConfig = {
        root: 'custom-root',
        // componentDir and outDirs not specified
      }

      mockLoadTsConfig.mockRejectedValue(new Error('TS config not found'))
      mockLoadJsConfig.mockResolvedValue(userConfig)

      const result = await resolveConfig({
        cwd: mockCwd,
        loadJsConfig: mockLoadJsConfig,
        loadTsConfig: mockLoadTsConfig,
      })

      expect(result).toEqual({
        ...defaultConfig,
        root: `${mockCwd}/custom-root`, // Relative path made absolute
      })
    })
  })
})
