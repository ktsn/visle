/**
 * Configuration for Visle plugin
 */
export interface VisleConfig {
  componentDir?: string
  serverOutDir?: string
  clientOutDir?: string
}

/**
 * Resolved configuration with all values guaranteed
 */
export type ResolvedVisleConfig = Required<VisleConfig>

export const defaultConfig: ResolvedVisleConfig = {
  componentDir: 'components',
  clientOutDir: 'dist/client',
  serverOutDir: 'dist/server',
}

const visleConfigKey = '__visle'

/**
 * Stores resolved visle config on Vite's resolved config object.
 */
export function setVisleConfig(viteConfig: Record<string, any>, config: ResolvedVisleConfig): void {
  viteConfig[visleConfigKey] = config
}

/**
 * Retrieves resolved visle config from Vite's resolved config object.
 */
export function getVisleConfig(viteConfig: Record<string, any>): ResolvedVisleConfig {
  const config = viteConfig[visleConfigKey]
  if (!config) {
    throw new Error('Visle config is not set. Make sure visle plugin is added to the Vite config.')
  }
  return config
}
