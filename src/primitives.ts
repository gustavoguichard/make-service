import type { StandardSchemaV1 } from '@standard-schema/spec'
import type { JSONValue, PathParams, SearchParams } from './types'

/**
 * @param url a string or URL to which the query parameters will be added
 * @param searchParams the query parameters
 * @returns the url with the query parameters added with the same type as the url
 */
function addQueryToURL<T extends string | URL>(
  url: T,
  searchParams?: SearchParams
): T {
  if (!searchParams) return url

  if (typeof url === 'string') {
    const separator = url.includes('?') ? '&' : '?'
    return `${url}${separator}${new URLSearchParams(searchParams)}` as T
  }
  if (searchParams && url instanceof URL) {
    const result = new URL(url.toString())
    for (const [key, value] of new URLSearchParams(searchParams).entries()) {
      result.searchParams.set(key, value)
    }
    return result as T
  }
  return url
}

/**
 * @param body the JSON-like body of the request
 * @returns the body is stringified if it is not a string and it is a JSON-like object. It also accepts other types of BodyInit such as Blob, ReadableStream, etc.
 */
function ensureStringBody<B extends JSONValue | BodyInit | null>(
  body?: B
): B extends JSONValue ? string : B {
  if (typeof body === 'undefined') return body as never
  if (typeof body === 'string') return body as never

  return (
    ['number', 'boolean', 'array', 'object'].includes(typeOf(body))
      ? JSON.stringify(body)
      : body
  ) as never
}

/**
 * @param baseURL the base path to the API
 * @returns a function that receives a path and an object of query parameters and returns a URL
 */
function makeGetApiURL<T extends string | URL>(baseURL: T) {
  const base = baseURL instanceof URL ? baseURL.toString() : baseURL
  return (path: string, searchParams?: SearchParams): T => {
    const url = `${base}/${path}`.replace(/([^https?:]\/)\/+/g, '$1')
    return addQueryToURL(url, searchParams) as T
  }
}

/**
 * It merges multiple HeadersInit objects into a single Headers object
 * @param entries Any number of HeadersInit objects
 * @returns a new Headers object with the merged headers
 */
function mergeHeaders(
  ...entries: (
    | HeadersInit
    | [string, undefined][]
    | Record<string, undefined>
  )[]
) {
  const result = new Headers()

  for (const entry of entries) {
    const headers = new Headers(entry as HeadersInit)

    for (const [key, value] of headers.entries()) {
      if (value === undefined || value === 'undefined') {
        result.delete(key)
      } else {
        result.set(key, value)
      }
    }
  }

  return result
}

/**
 *
 * @param url the url string or URL object to replace the params
 * @param params the params map to be replaced in the url
 * @returns the url with the params replaced and with the same type as the given url
 */
function replaceURLParams<T extends string | URL>(
  url: T,
  params: PathParams<T>
): T {
  // TODO: use the URL Pattern API as soon as it has better browser support
  if (!params) return url as T

  let urlString = String(url)
  for (const [key, value] of Object.entries(params)) {
    urlString = urlString.replace(new RegExp(`:${key}($|/)`), `${value}$1`)
  }
  return (url instanceof URL ? new URL(urlString) : urlString) as T
}

/**
 * This is an enhanced version of the typeof operator to check the type of more complex values.
 * @param t the value to be checked
 * @returns the type of the value
 */
function typeOf(t: unknown) {
  return Object.prototype.toString
    .call(t)
    .replace(/^\[object (.+)\]$/, '$1')
    .toLowerCase() as
    | 'array'
    | 'arraybuffer'
    | 'bigint'
    | 'blob'
    | 'boolean'
    | 'formdata'
    | 'function'
    | 'null'
    | 'number'
    | 'object'
    | 'readablestream'
    | 'string'
    | 'symbol'
    | 'undefined'
    | 'url'
    | 'urlsearchparams'
}

/**
 * Error thrown when the response cannot be parsed.
 */
class ParseResponseError extends Error {
  constructor(
    message: string,
    public issues: readonly StandardSchemaV1.Issue[]
  ) {
    super(JSON.stringify({ message, issues }, null, 2))
    this.name = 'ParseResponseError'
    this.issues = issues
  }
}

export {
  addQueryToURL,
  ensureStringBody,
  makeGetApiURL,
  mergeHeaders,
  replaceURLParams,
  typeOf,
}
export { ParseResponseError }
