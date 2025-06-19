import type { HTTP_METHODS } from './constants'
import type { StandardSchema } from './standard-schema'

type JSONValue =
  | string
  | number
  | boolean
  | Date // Will be turned into a string
  | { [x: string]: JSONValue | undefined | null }
  | Array<JSONValue | undefined | null>

type SearchParams = ConstructorParameters<typeof URLSearchParams>[0]

type TypedResponse = Omit<Response, 'json' | 'text'> & {
  json: TypedResponseJson
  text: TypedResponseText
}

type PathParams<T> = T extends string
  ? ExtractPathParams<T> extends Record<string, unknown>
    ? ExtractPathParams<T>
    : Record<string, string | number>
  : Record<string, string | number>

type EnhancedRequestInit<T = string> = Omit<RequestInit, 'body' | 'method'> & {
  method?: HTTPMethod | Lowercase<HTTPMethod>
  body?: JSONValue | BodyInit | null
  query?: SearchParams
  params?: PathParams<T>
  trace?: (
    fullUrl: string | URL,
    init: EnhancedRequestInit,
    response: TypedResponse
  ) => void | Promise<void>
}

type ServiceRequestInit<T = string> = Omit<EnhancedRequestInit<T>, 'method'>

type RequestTransformer = (
  request: EnhancedRequestInit
) => EnhancedRequestInit | Promise<EnhancedRequestInit>

type ResponseTransformer = (
  response: TypedResponse
) => TypedResponse | Promise<TypedResponse>

type BaseOptions = {
  headers?: HeadersInit | (() => HeadersInit | Promise<HeadersInit>)
  requestTransformer?: RequestTransformer
  responseTransformer?: ResponseTransformer
}

type HTTPMethod = (typeof HTTP_METHODS)[number]

type TypedResponseJson = <Input = unknown, Output = Input>(
  schema?: StandardSchema<Input, Output>
) => Promise<Output>

type TypedResponseText = <Input extends string = string, Output = Input>(
  schema?: StandardSchema<Input, Output>
) => Promise<Output>

type GetJson = (response: Response) => TypedResponseJson
type GetText = (response: Response) => TypedResponseText

type Prettify<T> = {
  [K in keyof T]: T[K]
} & {}

type ExtractPathParams<T extends string> =
  T extends `${infer _}:${infer Param}/${infer Rest}`
    ? Prettify<
        Omit<{ [K in Param]: string | number } & ExtractPathParams<Rest>, ''>
      >
    : T extends `${infer _}:${infer Param}`
      ? { [K in Param]: string | number }
      : // biome-ignore lint/complexity/noBannedTypes: I know what I'm doing
        {}

export type {
  EnhancedRequestInit,
  GetJson,
  GetText,
  HTTPMethod,
  JSONValue,
  PathParams,
  SearchParams,
  ServiceRequestInit,
  BaseOptions,
  TypedResponse,
  TypedResponseJson,
  TypedResponseText,
  RequestTransformer,
  ResponseTransformer,
}
