import { EnhancedRequestInit, Schema } from './types'

/**
 * It returns the JSON object or throws an error if the response is not ok.
 * @param response the Response to be parsed
 * @returns the response.json method that accepts a type or Zod schema for a typed json response
 */
function getJson(response: Response) {
  return async <T = unknown>(schema?: Schema<T>): Promise<T> => {
    const json = await response.json()
    return schema ? schema.parse(json) : (json as T)
  }
}

/**
 * @param response the Response to be parsed
 * @returns the response.text method that accepts a type or Zod schema for a typed response
 */
function getText(response: Response) {
  return async <T extends string = string>(schema?: Schema<T>): Promise<T> => {
    const text = await response.text()
    return schema ? schema.parse(text) : (text as T)
  }
}

/**
 *
 * @param url the url string or URL object to replace the params
 * @param params the params map to be replaced in the url
 * @returns the url with the params replaced and with the same type as the given url
 */
function replaceUrlParams(
  url: string | URL,
  params: EnhancedRequestInit['params'],
) {
  // TODO: use the URL Pattern API as soon as it has better browser support
  if (!params) return url

  let urlString = String(url)
  Object.entries(params).forEach(([key, value]) => {
    urlString = urlString.replace(new RegExp(`:${key}($|\/)`), `${value}$1`)
  })
  return url instanceof URL ? new URL(urlString) : urlString
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

export { getJson, getText, replaceUrlParams, typeOf }
