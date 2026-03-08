import path from 'node:path'

export type AbsolutePath = string & { readonly __brand: 'AbsolutePath' }
export type RelativePath = string & { readonly __brand: 'RelativePath' }

/**
 * Normalize backslashes to forward slashes
 * @internal
 */
function normalizePosix(p: string): string {
  return p.replace(/\\/g, '/')
}

/**
 * Matches `/` or drive letter like `C:/`
 */
function isAbsolute(p: string): boolean {
  return p.startsWith('/') || /^[a-zA-Z]:\//.test(p)
}

export function asAbs(value: string): AbsolutePath {
  const normalized = normalizePosix(value)
  if (!isAbsolute(normalized)) {
    throw new Error(`Expected absolute path, got: ${value}`)
  }
  return normalized as AbsolutePath
}

export function asRel(value: string): RelativePath {
  const normalized = normalizePosix(value)
  if (isAbsolute(normalized)) {
    throw new Error(`Expected relative path, got: ${value}`)
  }
  return normalized as RelativePath
}

export function resolve(base: AbsolutePath, ...segments: string[]): AbsolutePath {
  return normalizePosix(path.resolve(base, ...segments)) as AbsolutePath
}

export function join(base: AbsolutePath, ...segments: string[]): AbsolutePath
export function join(base: RelativePath, ...segments: string[]): RelativePath
export function join(base: string, ...segments: string[]): string {
  return normalizePosix(path.join(base, ...segments))
}

export function relative(from: AbsolutePath, to: AbsolutePath): RelativePath {
  return normalizePosix(path.relative(from, to)) as RelativePath
}

export function dirname(p: AbsolutePath): AbsolutePath
export function dirname(p: RelativePath): RelativePath
export function dirname(p: string): string {
  return normalizePosix(path.dirname(p))
}
