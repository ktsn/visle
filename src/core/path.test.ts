import { describe, expect, it } from 'vitest'

import { asAbs, asRel, dirname, join, resolve, relative } from './path.js'

describe('asAbs', () => {
  it('accepts absolute path', () => {
    const result = asAbs('/foo/bar')
    expect(result).toBe('/foo/bar')
  })

  it('throws for relative path', () => {
    expect(() => asAbs('foo/bar')).toThrow('Expected absolute path')
  })

  it('normalizes backslashes', () => {
    const result = asAbs('\\foo\\bar\\baz')
    expect(result).toBe('/foo/bar/baz')
  })

  it('accepts Windows drive letter path', () => {
    const result = asAbs('C:/foo/bar')
    expect(result).toBe('C:/foo/bar')
  })

  it('normalizes Windows backslash path', () => {
    const result = asAbs('C:\\foo\\bar')
    expect(result).toBe('C:/foo/bar')
  })
})

describe('asRel', () => {
  it('accepts relative path', () => {
    const result = asRel('foo/bar')
    expect(result).toBe('foo/bar')
  })

  it('throws for absolute path', () => {
    expect(() => asRel('/foo/bar')).toThrow('Expected relative path')
  })

  it('throws for Windows drive letter path', () => {
    expect(() => asRel('C:/foo/bar')).toThrow('Expected relative path')
  })

  it('normalizes backslashes', () => {
    const result = asRel('foo\\bar\\baz')
    expect(result).toBe('foo/bar/baz')
  })
})

describe('resolve', () => {
  it('resolves to absolute path', () => {
    const result = resolve(asAbs('/foo'), 'bar')
    expect(result).toBe('/foo/bar')
  })

  it('resolves .. segments', () => {
    const result = resolve(asAbs('/foo/bar'), '../baz')
    expect(result).toBe('/foo/baz')
  })

  it('resolves multiple segments', () => {
    const result = resolve(asAbs('/foo'), 'bar', 'baz')
    expect(result).toBe('/foo/bar/baz')
  })

  it.skipIf(process.platform !== 'win32')('preserves drive letter from base', () => {
    const result = resolve(asAbs('C:/foo'), 'bar')
    expect(result).toBe('C:/foo/bar')
  })

  it.skipIf(process.platform !== 'win32')('preserves drive letter from segment', () => {
    const result = resolve(asAbs('/foo'), 'D:/bar')
    expect(result).toBe('D:/bar')
  })
})

describe('join', () => {
  it('joins absolute paths', () => {
    const base = asAbs('/foo/bar')
    const result = join(base, 'baz', 'qux.ts')
    expect(result).toBe('/foo/bar/baz/qux.ts')
  })

  it('joins relative paths', () => {
    const base = asRel('foo/bar')
    const result = join(base, 'baz')
    expect(result).toBe('foo/bar/baz')
  })

  it('normalizes .. segments', () => {
    const base = asAbs('/foo/bar')
    const result = join(base, '..', 'baz')
    expect(result).toBe('/foo/baz')
  })
})

describe('relative', () => {
  it('computes relative path', () => {
    const result = relative(asAbs('/foo/bar'), asAbs('/foo/bar/baz/qux.ts'))
    expect(result).toBe('baz/qux.ts')
  })

  it('computes relative path with ..', () => {
    const result = relative(asAbs('/foo/bar'), asAbs('/foo/baz/qux.ts'))
    expect(result).toBe('../baz/qux.ts')
  })
})

describe('dirname', () => {
  it('returns dirname of absolute path', () => {
    const result = dirname(asAbs('/foo/bar/baz.ts'))
    expect(result).toBe('/foo/bar')
  })

  it('returns dirname of relative path', () => {
    const result = dirname(asRel('foo/bar/baz.ts'))
    expect(result).toBe('foo/bar')
  })
})
