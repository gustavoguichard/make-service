import { typeOf } from './internals'

type KebabToCamel<Str> = Str extends `${infer First}-${infer Rest}`
  ? `${First}${Capitalize<KebabToCamel<Rest>>}`
  : Str

type SnakeToCamel<Str> = Str extends `${infer First}_${infer Rest}`
  ? `${First}${Capitalize<SnakeToCamel<Rest>>}`
  : Str

type KebabToSnake<Str> = Str extends `${infer First}-${infer Rest}`
  ? `${First}_${KebabToSnake<Rest>}`
  : Str

type SnakeToKebab<Str> = Str extends `${infer First}_${infer Rest}`
  ? `${First}-${SnakeToKebab<Rest>}`
  : Str

type HandleFirstChar<Str> = Str extends `${infer First}${infer Rest}`
  ? `${Lowercase<First>}${Rest}`
  : Str

type CamelToSnakeFn<Str> = Str extends `${infer First}${infer Rest}`
  ? `${First extends Capitalize<First>
      ? '_'
      : ''}${Lowercase<First>}${CamelToSnakeFn<Rest>}`
  : Str

type CamelToSnake<Str> = CamelToSnakeFn<HandleFirstChar<Str>>

type CamelToKebabFn<Str> = Str extends `${infer First}${infer Rest}`
  ? `${First extends Capitalize<First>
      ? '-'
      : ''}${Lowercase<First>}${CamelToKebabFn<Rest>}`
  : Str

type CamelToKebab<Str> = CamelToKebabFn<HandleFirstChar<Str>>

function words(str: string) {
  const matches = str.match(
    /[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g,
  )
  return matches ? Array.from(matches) : [str]
}

function toCamelCase(str: string) {
  const result = words(str)
    .map((x) => x.slice(0, 1).toUpperCase() + x.slice(1).toLowerCase())
    .join('')
  return result.slice(0, 1).toLowerCase() + result.slice(1)
}

function toKebabCase(str: string) {
  return words(str)
    .map((x) => x.toLowerCase())
    .join('-')
}

function toSnakeCase(str: string) {
  return words(str)
    .map((x) => x.toLowerCase())
    .join('_')
}

function deepTransformKeys<T>(obj: T, transform: (s: string) => string): T {
  if (!['object', 'array'].includes(typeOf(obj))) return obj

  if (Array.isArray(obj)) {
    return obj.map((x) => deepTransformKeys(x, transform)) as T
  }
  const res = {} as T
  for (const key in obj) {
    res[transform(key) as keyof T] = deepTransformKeys(obj[key], transform)
  }
  return res
}

type DeepKebabToCamel<T> = T extends [any, ...any]
  ? { [I in keyof T]: DeepKebabToCamel<T[I]> }
  : T extends (infer V)[]
  ? DeepKebabToCamel<V>[]
  : {
      [K in keyof T as KebabToCamel<K>]: DeepKebabToCamel<T[K]>
    }
function kebabToCamel<T>(obj: T): DeepKebabToCamel<T> {
  return deepTransformKeys(obj, toCamelCase) as never
}

type DeepSnakeToCamel<T> = T extends [any, ...any]
  ? { [I in keyof T]: DeepSnakeToCamel<T[I]> }
  : T extends (infer V)[]
  ? DeepSnakeToCamel<V>[]
  : {
      [K in keyof T as SnakeToCamel<K>]: DeepSnakeToCamel<T[K]>
    }
function snakeToCamel<T>(obj: T): DeepSnakeToCamel<T> {
  return deepTransformKeys(obj, toCamelCase) as never
}

type DeepCamelToSnake<T> = T extends [any, ...any]
  ? { [I in keyof T]: DeepCamelToSnake<T[I]> }
  : T extends (infer V)[]
  ? DeepCamelToSnake<V>[]
  : {
      [K in keyof T as CamelToSnake<K>]: DeepCamelToSnake<T[K]>
    }
function camelToSnake<T>(obj: T): DeepCamelToSnake<T> {
  return deepTransformKeys(obj, toSnakeCase) as never
}

type DeepCamelToKebab<T> = T extends [any, ...any]
  ? { [I in keyof T]: DeepCamelToKebab<T[I]> }
  : T extends (infer V)[]
  ? DeepCamelToKebab<V>[]
  : {
      [K in keyof T as CamelToKebab<K>]: DeepCamelToKebab<T[K]>
    }
function camelToKebab<T>(obj: T): DeepCamelToKebab<T> {
  return deepTransformKeys(obj, toKebabCase) as never
}

type DeepSnakeToKebab<T> = T extends [any, ...any]
  ? { [I in keyof T]: DeepSnakeToKebab<T[I]> }
  : T extends (infer V)[]
  ? DeepSnakeToKebab<V>[]
  : {
      [K in keyof T as SnakeToKebab<K>]: DeepSnakeToKebab<T[K]>
    }
function snakeToKebab<T>(obj: T): DeepSnakeToKebab<T> {
  return deepTransformKeys(obj, toKebabCase) as never
}

type DeepKebabToSnake<T> = T extends [any, ...any]
  ? { [I in keyof T]: DeepKebabToSnake<T[I]> }
  : T extends (infer V)[]
  ? DeepKebabToSnake<V>[]
  : {
      [K in keyof T as KebabToSnake<K>]: DeepKebabToSnake<T[K]>
    }
function kebabToSnake<T>(obj: T): DeepKebabToSnake<T> {
  return deepTransformKeys(obj, toSnakeCase) as never
}

export type {
  CamelToKebab,
  CamelToSnake,
  DeepCamelToKebab,
  DeepCamelToSnake,
  DeepKebabToCamel,
  DeepKebabToSnake,
  DeepSnakeToCamel,
  DeepSnakeToKebab,
  KebabToCamel,
  KebabToSnake,
  SnakeToCamel,
  SnakeToKebab,
}
export {
  camelToKebab,
  camelToSnake,
  kebabToCamel,
  kebabToSnake,
  snakeToCamel,
  snakeToKebab,
}
