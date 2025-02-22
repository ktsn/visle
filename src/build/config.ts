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
