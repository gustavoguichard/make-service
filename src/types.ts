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
  body?: JSONValue
  query?: SearchParams
  trace?: (...args: Parameters<typeof fetch>) => void
}

type ServiceRequestInit = Omit<EnhancedRequestInit, 'method'>

type HTTPMethod = (typeof HTTP_METHODS)[number]

type TypedResponseJson = ReturnType<typeof getJson>
type TypedResponseText = ReturnType<typeof getText>

export type {
  EnhancedRequestInit,
  HTTPMethod,
  JSONValue,
  Schema,
  SearchParams,
  ServiceRequestInit,
  TypedResponse,
  TypedResponseJson,
  TypedResponseText,
}
