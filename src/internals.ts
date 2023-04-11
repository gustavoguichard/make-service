import { HTTP_METHODS } from './constants.ts'
import { HTTPMethod, Schema } from './types.ts'

/**
 * It returns the JSON object or throws an error if the response is not ok.
 * @param response the Response to be parsed
 * @returns the response.json method that accepts a type or Zod schema for a typed json response
 */
function getJson(response: Response) {
  return async <T = unknown>(schema?: Schema<T>): Promise<T> => {
    if (!response.ok) {
      throw new Error(await response.text())
    }
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

function isHTTPMethod(method: string | symbol): method is HTTPMethod {
  return HTTP_METHODS.includes(method as HTTPMethod)
}

export { getJson, getText, isHTTPMethod }
