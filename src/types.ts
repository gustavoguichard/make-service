import { HTTP_METHODS } from './constants'

type Schema<T> = { parse: (d: unknown) => T }

type JSONValue =
  | string
  | number
  | boolean
  | { [x: string]: JSONValue }
  | Array<JSONValue>

type SearchParams = ConstructorParameters<typeof URLSearchParams>[0]

type HTTPMethod = (typeof HTTP_METHODS)[number]

export type { HTTPMethod, JSONValue, Schema, SearchParams }
