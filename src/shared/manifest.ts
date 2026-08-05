export const manifestFileName = 'visle-manifest.json'

export type SourceValue<T> = T | (() => T | Promise<T>)

interface ManifestShape<CssValue, JsValue> {
  base: string
  entryDir: string
  entryExt: string[]
  cssMap: Record<string, CssValue>
  jsMap: Record<string, JsValue>
  islandsBootstrap: string
}

export type BuildManifest = ManifestShape<string[], string>

export type ManifestSource = ManifestShape<SourceValue<string[]>, SourceValue<string>>
