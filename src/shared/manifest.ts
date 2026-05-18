export const manifestFileName = 'visle-manifest.json'

export interface ManifestData {
  base: string
  entryDir: string
  entryExt: string[]
  cssMap: Record<string, string[]>
  jsMap: Record<string, string>
  islandsBootstrap: string
}
