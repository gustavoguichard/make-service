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

type EnhancedRequestInit = Omit<RequestInit, 'body'> & {
  body?: JSONValue | BodyInit | null
  query?: SearchParams
  params?: Record<string, string>
  trace?: (...args: Parameters<typeof fetch>) => void
}

type ServiceRequestInit = Omit<EnhancedRequestInit, 'method'>

type HTTPMethod = (typeof HTTP_METHODS)[number]

type TypedResponseJson = ReturnType<typeof getJson>
type TypedResponseText = ReturnType<typeof getText>

type Prettify<T> = {
  [K in keyof T]: T[K]
} & {}

type NoEmpty<T> = keyof T extends never ? never : T
type PathParams<T extends string> = NoEmpty<
  T extends `${infer _}:${infer Param}/${infer Rest}`
    ? Prettify<{ [K in Param]: string } & PathParams<Rest>>
    : T extends `${infer _}:${infer Param}`
    ? { [K in Param]: string }
    : {}
>

type Route = {
  method: HTTPMethod
  path: string
  query?: Record<string, true | readonly string[]>
}

type StrictReqInit<R extends Route> = Omit<
  ServiceRequestInit,
  'query' | 'params'
> &
  (PathParams<R['path']> extends never
    ? { params?: never }
    : { params: PathParams<R['path']> }) & {
    query?: R['query'] extends { [Key in infer K]: any }
      ? {
          [Key in K]?: R['query'][Key] extends true
            ? string
            : R['query'][Key] extends infer U
            ? // @ts-ignore: for some reason the inference gets lost on the line above
              U[number]
            : never
        }
      : never
  }

export type {
  EnhancedRequestInit,
  HTTPMethod,
  JSONValue,
  PathParams,
  Route,
  Schema,
  SearchParams,
  ServiceRequestInit,
  StrictReqInit,
  TypedResponse,
  TypedResponseJson,
  TypedResponseText,
}
