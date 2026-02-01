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
export function resolveVisleConfig(
  config: VisleConfig = {},
): ResolvedVisleConfig {
  return {
    componentDir: config.componentDir ?? defaultConfig.componentDir,
    clientOutDir: config.clientOutDir ?? defaultConfig.clientOutDir,
    serverOutDir: config.serverOutDir ?? defaultConfig.serverOutDir,
  }
}

const visleConfigKey = '__visle'

/**
 * Stores resolved visle config on Vite's resolved config object.
 */
export function setVisleConfig(
  viteConfig: Record<string, any>,
  config: ResolvedVisleConfig,
): void {
  viteConfig[visleConfigKey] = config
}

/**
 * Retrieves resolved visle config from Vite's resolved config object.
 */
export function getVisleConfig(
  viteConfig: Record<string, any>,
): ResolvedVisleConfig {
  const config = viteConfig[visleConfigKey]
  if (!config) {
    throw new Error(
      'Visle config is not set. Make sure visle plugin is added to the Vite config.',
    )
  }
  return config
}
