// oxlint-disable typescript/no-unsafe-type-assertion
import { describe, expect, test } from 'vite-plus/test'

import { serializeProps, deserializeProps } from './serialization.ts'

function roundTrip(props: Record<string, unknown>): Record<string, unknown> {
  return deserializeProps(serializeProps(props))
}

describe('serializeProps / deserializeProps', () => {
  describe('pass-through of plain JSON values', () => {
    test('strings', () => {
      expect(roundTrip({ a: 'hello' })).toEqual({ a: 'hello' })
    })

    test('numbers', () => {
      expect(roundTrip({ a: 42, b: -3.14, c: 0 })).toEqual({ a: 42, b: -3.14, c: 0 })
    })

    test('booleans', () => {
      expect(roundTrip({ a: true, b: false })).toEqual({ a: true, b: false })
    })

    test('null', () => {
      expect(roundTrip({ a: null })).toEqual({ a: null })
    })

    test('plain objects', () => {
      expect(roundTrip({ a: { b: 1, c: 'hi' } })).toEqual({ a: { b: 1, c: 'hi' } })
    })
  })

  describe('arrays', () => {
    test('round-trips regular arrays', () => {
      expect(roundTrip({ items: [1, 'two', true] })).toEqual({ items: [1, 'two', true] })
    })

    test('round-trips nested arrays', () => {
      expect(roundTrip({ a: [[1, 2], [3]] })).toEqual({ a: [[1, 2], [3]] })
    })

    test('round-trips empty arrays', () => {
      expect(roundTrip({ a: [] })).toEqual({ a: [] })
    })
  })

  describe('special types', () => {
    test('undefined', () => {
      expect(roundTrip({ a: undefined })).toEqual({ a: undefined })
    })

    test('Date', () => {
      const date = new Date('2024-01-01T00:00:00.000Z')
      const result = roundTrip({ created: date })
      expect(result.created).toBeInstanceOf(Date)
      expect((result.created as Date).toISOString()).toBe('2024-01-01T00:00:00.000Z')
    })

    test('RegExp', () => {
      const result = roundTrip({ pattern: /foo/gi })
      expect(result.pattern).toBeInstanceOf(RegExp)
      expect((result.pattern as RegExp).source).toBe('foo')
      expect((result.pattern as RegExp).flags).toBe('gi')
    })

    test('Map', () => {
      const map = new Map<string, number>([
        ['a', 1],
        ['b', 2],
      ])
      const result = roundTrip({ data: map })
      expect(result.data).toBeInstanceOf(Map)
      expect(result.data).toEqual(map)
    })

    test('Set', () => {
      const set = new Set([1, 2, 3])
      const result = roundTrip({ items: set })
      expect(result.items).toBeInstanceOf(Set)
      expect(result.items).toEqual(set)
    })

    test('URL', () => {
      const url = new URL('https://example.com/path?q=1')
      const result = roundTrip({ link: url })
      expect(result.link).toBeInstanceOf(URL)
      expect((result.link as URL).href).toBe(url.href)
    })

    test('BigInt', () => {
      const result = roundTrip({ big: 12345678901234567890n })
      expect(result.big).toBe(12345678901234567890n)
    })

    test('Infinity', () => {
      expect(roundTrip({ a: Infinity })).toEqual({ a: Infinity })
    })

    test('-Infinity', () => {
      expect(roundTrip({ a: -Infinity })).toEqual({ a: -Infinity })
    })

    test('NaN', () => {
      const result = roundTrip({ a: NaN })
      expect(result.a).toBeNaN()
    })
  })

  describe('nested structures', () => {
    test('Map containing Dates', () => {
      const map = new Map([['start', new Date('2024-01-01')]])
      const result = roundTrip({ schedule: map })
      const resultMap = result.schedule as Map<string, Date>
      expect(resultMap).toBeInstanceOf(Map)
      expect(resultMap.get('start')).toBeInstanceOf(Date)
      expect(resultMap.get('start')!.toISOString()).toBe(new Date('2024-01-01').toISOString())
    })

    test('array of Sets', () => {
      const result = roundTrip({ groups: [new Set([1, 2]), new Set([3, 4])] })
      const groups = result.groups as Set<number>[]
      expect(groups).toHaveLength(2)
      expect(groups[0]).toEqual(new Set([1, 2]))
      expect(groups[1]).toEqual(new Set([3, 4]))
    })

    test('object with mixed special types', () => {
      const props = {
        name: 'test',
        created: new Date('2024-06-15'),
        pattern: /^test$/i,
        tags: new Set(['a', 'b']),
        metadata: new Map([['key', 'value']]),
        count: 42n,
        items: [1, 'two', undefined],
      }
      const result = roundTrip(props)
      expect(result.name).toBe('test')
      expect(result.created).toBeInstanceOf(Date)
      expect(result.pattern).toBeInstanceOf(RegExp)
      expect(result.tags).toBeInstanceOf(Set)
      expect(result.metadata).toBeInstanceOf(Map)
      expect(result.count).toBe(42n)
      expect(result.items).toEqual([1, 'two', undefined])
    })
  })

  describe('serializeProps error cases', () => {
    test('throws on circular reference', () => {
      const obj: Record<string, unknown> = { a: 1 }
      obj.self = obj
      expect(() => serializeProps(obj)).toThrow('circular reference')
    })

    test('throws on function', () => {
      expect(() => serializeProps({ fn: () => {} })).toThrow('function')
    })

    test('throws on symbol', () => {
      expect(() => serializeProps({ sym: Symbol('test') })).toThrow('symbol')
    })
  })

  describe('deserializeProps edge cases', () => {
    test('returns empty object for non-object JSON', () => {
      expect(deserializeProps('"hello"')).toEqual({})
      expect(deserializeProps('42')).toEqual({})
      expect(deserializeProps('[1,2]')).toEqual({})
      expect(deserializeProps('null')).toEqual({})
    })

    test('throws on invalid JSON', () => {
      expect(() => deserializeProps('{invalid')).toThrow()
    })
  })
})
