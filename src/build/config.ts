export interface ResolvedIslandsConfig {
  rootDir: string
  componentDir: string
  clientOutDir: string
  serverOutDir: string
}

export type IslandsConfig = Partial<ResolvedIslandsConfig>

export const defaultConfig: ResolvedIslandsConfig = {
  rootDir: process.cwd(),
  componentDir: 'components',
  clientOutDir: 'dist/client',
  serverOutDir: 'dist/server',
}
