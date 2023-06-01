import { typedResponse } from './api'
import { typeOf } from './internals'
import type {
  EnhancedBodyInit,
  GetJson,
  RequestTransformer,
  ResponseTransformer,
  Schema,
  SearchParams,
} from './types'

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

function transformFormData(
  formData: FormData,
  transformKey: (str: string) => string,
) {
  const transformed = new FormData()
  for (const [key, value] of formData) {
    transformed.append(transformKey(key), value)
  }
  return transformed
}

function transformSearchParams(
  searchParams: URLSearchParams,
  transformKey: (str: string) => string,
) {
  const transformed = new URLSearchParams()
  for (const [key, value] of searchParams) {
    transformed.append(transformKey(key), value)
  }
  return transformed
}

function transformQuery(
  query: SearchParams,
  transformKey: (str: string) => string,
) {
  if (Array.isArray(query)) {
    return query.map(([key, value]) => [transformKey(key), value])
  }

  if (query instanceof URLSearchParams) {
    return transformSearchParams(query, transformKey)
  }

  if (typeof query === 'string') {
    const searchParams = new URLSearchParams(query)
    return transformSearchParams(searchParams, transformKey).toString()
  }

  if (typeof query === 'object') return deepTransformKeys(query, transformKey)

  return query
}

function transformBody(
  body: EnhancedBodyInit | undefined,
  transformKey: (str: string) => string,
) {
  if (body instanceof URLSearchParams) {
    return transformSearchParams(body, transformKey)
  }

  if (body instanceof FormData) {
    return transformFormData(body, transformKey)
  }

  return deepTransformKeys(body, transformKey)
}

/**
 * Creates a requestTransformer to use with makeService or makeFetcher that
 * will deeply transform the keys of the query and the body of the request.
 * @param transformKey a function that receives a key and transforms it
 * @returns a RequestTransformer function
 * @example const requestTransformer = makeRequestTransformer((key) =>
 *   key.toUpperCase(),
 * )
 * const service = makeService('https://api.com', { requestTransformer })
 * // This will uppercase all keys of a request's query and body
 */
function makeRequestTransformer(
  transformKey: (str: string) => string,
): RequestTransformer {
  return (request) => {
    const query = transformQuery(request.query, transformKey)
    const body = transformBody(request.body, transformKey)

    return { ...request, query, body }
  }
}

const kebabRequest = makeRequestTransformer(toKebabCase)
const snakeRequest = makeRequestTransformer(toSnakeCase)
const camelRequest = makeRequestTransformer(toCamelCase)

/**
 * Creates a responseTransformer to use with makeService or makeFetcher that
 * will deeply transform the keys of the JSON body of the response.
 * @param transformKey a function that receives a key and transforms it
 * @returns a ResponseTransformer function
 * @example const responseTransformer = makeResponseTransformer((key) =>
 *   key.toUpperCase(),
 * )
 * const service = makeService('https://api.com', { responseTransformer })
 * // This will uppercase all keys of the response's JSON body
 */
function makeResponseTransformer(
  transformKey: (str: string) => string,
): ResponseTransformer {
  const getJson: GetJson =
    (response) =>
    async <T = unknown>(schema?: Schema<T>): Promise<T> => {
      const json = deepTransformKeys(await response.json(), transformKey)
      return schema ? schema.parse(json) : (json as T)
    }

  return (response) => typedResponse(response, { getJson })
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
  kebabRequest,
  snakeRequest,
  camelRequest,
  makeRequestTransformer,
  makeResponseTransformer,
}
