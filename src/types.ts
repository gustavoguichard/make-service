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

type PathParams<T> = T extends string
  ? ExtractPathParams<T> extends Record<string, unknown>
    ? ExtractPathParams<T>
    : Record<string, string>
  : Record<string, string>

type EnhancedBodyInit = JSONValue | BodyInit | null

type EnhancedRequestInit<T = string> = Omit<RequestInit, 'body' | 'method'> & {
  method?: HTTPMethod | Lowercase<HTTPMethod>
  body?: EnhancedBodyInit
  query?: SearchParams
  params?: PathParams<T>
  trace?: (...args: Parameters<typeof fetch>) => void
}

type ServiceRequestInit<T = string> = Omit<EnhancedRequestInit<T>, 'method'>
type RequestTransformer = (
  request: EnhancedRequestInit,
) => EnhancedRequestInit | Promise<EnhancedRequestInit>
type ResponseTransformer = (
  response: TypedResponse,
) => TypedResponse | Promise<TypedResponse>

type BaseOptions = {
  headers?: HeadersInit | (() => HeadersInit | Promise<HeadersInit>)
  requestTransformer?: RequestTransformer
  responseTransformer?: ResponseTransformer
}

type HTTPMethod = (typeof HTTP_METHODS)[number]

type GetJson = typeof getJson
type GetText = typeof getText
type TypedResponseJson = ReturnType<GetJson>
type TypedResponseText = ReturnType<GetText>

type Prettify<T> = {
  [K in keyof T]: T[K]
} & {}

type ExtractPathParams<T extends string> =
  T extends `${infer _}:${infer Param}/${infer Rest}`
    ? Prettify<Omit<{ [K in Param]: string } & ExtractPathParams<Rest>, ''>>
    : T extends `${infer _}:${infer Param}`
    ? { [K in Param]: string }
    : {}

export type {
  EnhancedBodyInit,
  EnhancedRequestInit,
  GetJson,
  GetText,
  HTTPMethod,
  JSONValue,
  PathParams,
  Schema,
  SearchParams,
  ServiceRequestInit,
  BaseOptions,
  TypedResponse,
  TypedResponseJson,
  TypedResponseText,
  RequestTransformer,
  ResponseTransformer,
}
