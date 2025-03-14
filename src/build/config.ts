import path from 'node:path'

export interface ResolvedIslandsConfig {
  root: string
  componentDir: string
  clientOutDir: string
  serverOutDir: string
}

export type IslandsConfig = Partial<ResolvedIslandsConfig>

export const defaultConfig: ResolvedIslandsConfig = {
  root: process.cwd(),
  componentDir: 'components',
  clientOutDir: 'dist/client',
  serverOutDir: 'dist/server',
}

/**
 * Resolves the user config from visle.config.js and merges it with default config.
 * Makes root path absolute if it's relative.
 */
export async function resolveConfig({
  cwd = process.cwd(),
  loadConfig = (configPath: string) =>
    import(configPath).then((m) => m.default || m),
}: {
  cwd?: string
  loadConfig?: (configPath: string) => Promise<IslandsConfig>
} = {}): Promise<ResolvedIslandsConfig> {
  const configPath = path.resolve(cwd, 'visle.config.js')
  const userConfig = await loadConfig(configPath).catch(() => ({}))

  // Create a merged config with proper typing
  const config: ResolvedIslandsConfig = { ...defaultConfig, ...userConfig }

  // Ensure root is absolute
  if (!path.isAbsolute(config.root)) {
    config.root = path.resolve(cwd, config.root)
  }

  return config
}
