import { HTTP_METHODS } from './constants'
import { getJson, getText } from './internals'

type Schema<T> = { parse: (d: unknown) => T }

type JSONValue =
  | string
  | number
  | boolean
  | { [x: string]: JSONValue }
  | Array<JSONValue>

type SearchParams = ConstructorParameters<typeof URLSearchParams>[0]

type TypedResponse = Omit<Response, 'json' | 'text'> & {
  json: TypedResponseJson
  text: TypedResponseText
}

type Params<T> = T extends string
  ? PathParams<T> extends never
    ? Record<string, string>
    : PathParams<T>
  : Record<string, string>

type EnhancedRequestInit<T = string> = Omit<RequestInit, 'body' | 'method'> & {
  method?: HTTPMethod | Lowercase<HTTPMethod>
  body?: JSONValue | BodyInit | null
  query?: SearchParams
  params?: Params<T>
  trace?: (...args: Parameters<typeof fetch>) => void
}

type ServiceRequestInit<T = string> = Omit<EnhancedRequestInit<T>, 'method'>

type HTTPMethod = (typeof HTTP_METHODS)[number]

type TypedResponseJson = ReturnType<typeof getJson>
type TypedResponseText = ReturnType<typeof getText>

type Prettify<T> = {
  [K in keyof T]: T[K]
} & {}

type PathParams<T extends string> =
  T extends `${infer _}:${infer Param}/${infer Rest}`
    ? Prettify<Omit<{ [K in Param]: string } & PathParams<Rest>, ''>>
    : T extends `${infer _}:${infer Param}`
    ? { [K in Param]: string }
    : {}

export type {
  EnhancedRequestInit,
  HTTPMethod,
  JSONValue,
  Params,
  PathParams,
  Schema,
  SearchParams,
  ServiceRequestInit,
  TypedResponse,
  TypedResponseJson,
  TypedResponseText,
}
