import path from 'node:path'
import fs from 'node:fs'
import * as esbuild from 'esbuild'
import { fileURLToPath } from 'node:url'

/**
 * Helper function to provide type checking for TypeScript configuration
 */
export function defineConfig(config: IslandsConfig): IslandsConfig {
  return config
}

export interface ResolvedIslandsConfig {
  root: string
  devOrigin: string | undefined
  componentDir: string
  clientOutDir: string
  serverOutDir: string
}

export type IslandsConfig = Partial<ResolvedIslandsConfig>

export const defaultConfig: ResolvedIslandsConfig = {
  root: process.cwd(),
  devOrigin: undefined,
  componentDir: 'components',
  clientOutDir: 'dist/client',
  serverOutDir: 'dist/server',
}

/**
 * Compiles TypeScript config file to JavaScript and imports it
 */
export async function loadTypeScriptConfig(
  filePath: string,
): Promise<IslandsConfig> {
  // Check if file exists first to provide clearer error
  if (!fs.existsSync(filePath)) {
    throw new Error(`TypeScript config file not found: ${filePath}`)
  }

  // Define output file path
  const dirPath = path.dirname(filePath)
  const outfile = path.join(dirPath, `visle-temp-${Date.now()}.mjs`)

  try {
    // Compile TypeScript to JavaScript
    await esbuild.build({
      entryPoints: [filePath],
      outfile,
      format: 'esm',
      target: 'esnext',
      platform: 'node',
    })

    // Import the compiled JavaScript
    const config = await import(fileURLToPath(new URL(`file://${outfile}`)))
    return config.default || config
  } finally {
    // Clean up temporary file
    try {
      if (fs.existsSync(outfile)) {
        fs.unlinkSync(outfile)
      }
    } catch {
      // Silently ignore cleanup errors
    }
  }
}

/**
 * Resolves the user config from visle.config.ts or visle.config.js and merges it with default config.
 * Prioritizes TypeScript config over JavaScript config.
 * Makes root path absolute if it's relative.
 */
export async function resolveConfig({
  cwd = process.cwd(),
  loadJsConfig = (configPath: string) =>
    import(configPath).then((m) => m.default || m),
  loadTsConfig = loadTypeScriptConfig,
}: {
  cwd?: string
  loadJsConfig?: (configPath: string) => Promise<IslandsConfig>
  loadTsConfig?: (configPath: string) => Promise<IslandsConfig>
} = {}): Promise<ResolvedIslandsConfig> {
  const tsConfigPath = path.resolve(cwd, 'visle.config.ts')
  const jsConfigPath = path.resolve(cwd, 'visle.config.js')

  let userConfig: IslandsConfig = {}

  // Try TypeScript config first
  try {
    userConfig = await loadTsConfig(tsConfigPath)
  } catch {
    // If TS config fails, try JS config
    try {
      userConfig = await loadJsConfig(jsConfigPath)
    } catch {
      // Both configs failed, use default config
    }
  }

  // Create a merged config with proper typing
  const config: ResolvedIslandsConfig = { ...defaultConfig, ...userConfig }

  // Ensure root is absolute
  if (!path.isAbsolute(config.root)) {
    config.root = path.resolve(cwd, config.root)
  }

  return config
}
