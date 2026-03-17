// oxlint-disable typescript/no-unsafe-type-assertion
import path from 'node:path'

export type AbsolutePath = string & { readonly __brand: 'AbsolutePath' }
export type RelativePath = string & { readonly __brand: 'RelativePath' }

/**
 * Normalize backslashes to forward slashes
 */
export function normalizePath(p: string): string {
  return p.replace(/\\/g, '/')
}

const driveLetterRE = /^[a-zA-Z]:/

function hasDriveLetter(p: string): boolean {
  return driveLetterRE.test(p)
}

/**
 * Matches `/` or drive letter like `C:/`
 */
function isAbsolute(p: string): boolean {
  return p.startsWith('/') || hasDriveLetter(p)
}

export function asAbs(value: string): AbsolutePath {
  const normalized = normalizePath(value)
  if (!isAbsolute(normalized)) {
    throw new Error(`Expected absolute path, got: ${value}`)
  }
  return normalized as AbsolutePath
}

export function asRel(value: string): RelativePath {
  const normalized = normalizePath(value)
  if (isAbsolute(normalized)) {
    throw new Error(`Expected relative path, got: ${value}`)
  }
  return normalized as RelativePath
}

export function resolve(base: AbsolutePath, ...segments: string[]): AbsolutePath {
  const result = normalizePath(path.resolve(base, ...segments))

  // On Windows, path.resolve prepends the current drive letter when inputs
  // don't include one. Strip it to keep results consistent with inputs.
  if (
    process.platform === 'win32' &&
    hasDriveLetter(result) &&
    [base, ...segments].every((s) => !hasDriveLetter(s))
  ) {
    return result.replace(driveLetterRE, '') as AbsolutePath
  }

  return result as AbsolutePath
}

export function join(base: AbsolutePath, ...segments: string[]): AbsolutePath
export function join(base: RelativePath, ...segments: string[]): RelativePath
export function join(base: string, ...segments: string[]): string {
  return normalizePath(path.join(base, ...segments))
}

export function relative(from: AbsolutePath, to: AbsolutePath): RelativePath {
  return normalizePath(path.relative(from, to)) as RelativePath
}

export function dirname(p: AbsolutePath): AbsolutePath
export function dirname(p: RelativePath): RelativePath
export function dirname(p: string): string {
  return normalizePath(path.dirname(p))
}
