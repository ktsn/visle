// oxlint-disable typescript/no-unsafe-type-assertion

// Type codes for tagged-tuple encoding
const TYPE_ARRAY = 0
const TYPE_UNDEFINED = 1
const TYPE_DATE = 2
const TYPE_REGEXP = 3
const TYPE_MAP = 4
const TYPE_SET = 5
const TYPE_URL = 6
const TYPE_BIGINT = 7
const TYPE_INFINITY = 8
const TYPE_NEG_INFINITY = 9
const TYPE_NAN = 10

/**
 * Serialize props value passed to island components.
 * It supports JSON serializable values and types in type codes defined above.
 * Non-JSON serializable values will be encoded to a tagged-tuple which has
 * a type code and a serialized payload.
 *
 * @example
 * ```
 * [1, 2, 3] -> [0, [1, 2, 3]]
 * undefined -> [1]
 * new Date("2024-01-01") -> [2, "2024-01-01T00:00:00.000Z"]
 * ```
 *
 * It does not support circular data structures. Throws an error it it is detected.
 *
 * The output is a JSON string with tagged-tuple encoding.
 */
export function serializeProps(props: Record<string, unknown>): string {
  const seen = new WeakSet<object>()
  const serialized: Record<string, unknown> = {}
  for (const key of Object.keys(props)) {
    serialized[key] = serializeValue(props[key], seen)
  }
  return JSON.stringify(serialized)
}

/**
 * Deserialize props value from JSON string with tagged-tuple encoding.
 * If the JSON's root value is not an object, it returns an empty object.
 */
export function deserializeProps(json: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(json)
  if (!isRecord(parsed)) {
    return {}
  }

  const result: Record<string, unknown> = {}
  for (const key of Object.keys(parsed)) {
    result[key] = deserializeValue(parsed[key])
  }
  return result
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function serializeValue(value: unknown, seen: WeakSet<object>): unknown {
  if (value === null) {
    return null
  }

  if (value === undefined) {
    return [TYPE_UNDEFINED]
  }

  switch (typeof value) {
    case 'string':
    case 'boolean':
      return value
    case 'number':
      if (Number.isNaN(value)) return [TYPE_NAN]
      if (value === Infinity) return [TYPE_INFINITY]
      if (value === -Infinity) return [TYPE_NEG_INFINITY]
      return value
    case 'bigint':
      return [TYPE_BIGINT, value.toString()]
    case 'function':
      throw new Error(`[visle] Cannot serialize function prop`)
    case 'symbol':
      throw new Error(`[visle] Cannot serialize symbol prop`)
  }

  // value is an object from here
  const obj = value as object

  if (seen.has(obj)) {
    throw new Error(`[visle] Cannot serialize circular reference in props`)
  }
  seen.add(obj)

  let result: unknown

  if (Array.isArray(obj)) {
    result = [TYPE_ARRAY, obj.map((item) => serializeValue(item, seen))]
  } else if (obj instanceof Date) {
    result = [TYPE_DATE, obj.toISOString()]
  } else if (obj instanceof RegExp) {
    result = [TYPE_REGEXP, [obj.source, obj.flags]]
  } else if (obj instanceof Map) {
    const entries: [unknown, unknown][] = []
    for (const [k, v] of obj) {
      entries.push([serializeValue(k, seen), serializeValue(v, seen)])
    }
    result = [TYPE_MAP, entries]
  } else if (obj instanceof Set) {
    result = [TYPE_SET, [...obj].map((item) => serializeValue(item, seen))]
  } else if (obj instanceof URL) {
    result = [TYPE_URL, obj.href]
  } else if (isRecord(obj)) {
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(obj)) {
      out[key] = serializeValue(obj[key], seen)
    }
    result = out
  }

  seen.delete(obj)
  return result
}

function deserializeValue(value: unknown): unknown {
  if (value === null || typeof value !== 'object') {
    return value
  }

  if (Array.isArray(value)) {
    const typeCode = value[0] as number
    const payload = value[1] as unknown

    switch (typeCode) {
      case TYPE_ARRAY:
        return (payload as unknown[]).map(deserializeValue)
      case TYPE_UNDEFINED:
        return undefined
      case TYPE_DATE:
        return new Date(String(payload))
      case TYPE_REGEXP: {
        const pair = payload as [string, string]
        return new RegExp(pair[0], pair[1])
      }
      case TYPE_MAP: {
        const entries = payload as [unknown, unknown][]
        return new Map(entries.map(([k, v]) => [deserializeValue(k), deserializeValue(v)]))
      }
      case TYPE_SET:
        return new Set((payload as unknown[]).map(deserializeValue))
      case TYPE_URL:
        return new URL(String(payload))
      case TYPE_BIGINT:
        return BigInt(String(payload))
      case TYPE_INFINITY:
        return Infinity
      case TYPE_NEG_INFINITY:
        return -Infinity
      case TYPE_NAN:
        return NaN
    }
  }

  if (isRecord(value)) {
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(value)) {
      out[key] = deserializeValue(value[key])
    }
    return out
  }

  return value
}
