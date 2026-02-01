import { describe, expect, test } from 'vitest'
import { resolveVisleConfig, defaultConfig } from '../../src/build/config.ts'

describe('Config', () => {
  describe('resolveVisleConfig', () => {
    test('returns default config when no options provided', () => {
      const result = resolveVisleConfig()

      expect(result).toEqual(defaultConfig)
    })

    test('merges custom config with defaults', () => {
      const result = resolveVisleConfig({
        componentDir: 'custom-components',
      })

      expect(result).toEqual({
        ...defaultConfig,
        componentDir: 'custom-components',
      })
    })

    test('overrides all default values when all options provided', () => {
      const customConfig = {
        componentDir: 'custom-components',
        clientOutDir: 'custom-client',
        serverOutDir: 'custom-server',
      }

      const result = resolveVisleConfig(customConfig)

      expect(result).toEqual(customConfig)
    })

    test('preserves default values for unspecified properties', () => {
      const result = resolveVisleConfig({
        serverOutDir: 'custom-server',
      })

      expect(result).toEqual({
        componentDir: defaultConfig.componentDir,
        clientOutDir: defaultConfig.clientOutDir,
        serverOutDir: 'custom-server',
      })
    })
  })
})
