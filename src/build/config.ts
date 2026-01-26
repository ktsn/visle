/**
 * Configuration for Visle plugin
 */
export interface VisleConfig {
  componentDir?: string // default: "components"
  serverOutDir?: string // default: "dist/server"
  clientOutDir?: string // default: "dist/client"
}

/**
 * Resolved configuration with all values guaranteed
 */
export interface ResolvedVisleConfig {
  componentDir: string
  clientOutDir: string
  serverOutDir: string
}

export const defaultConfig: ResolvedVisleConfig = {
  componentDir: 'components',
  clientOutDir: 'dist/client',
  serverOutDir: 'dist/server',
}

/**
 * Resolves user config with defaults
 */
export function resolveVisleConfig(config: VisleConfig = {}): ResolvedVisleConfig {
  return {
    componentDir: config.componentDir ?? defaultConfig.componentDir,
    clientOutDir: config.clientOutDir ?? defaultConfig.clientOutDir,
    serverOutDir: config.serverOutDir ?? defaultConfig.serverOutDir,
  }
}
