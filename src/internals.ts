import type { GetJson, GetText, Schema } from './types'

/**
 * It returns the JSON object or throws an error if the response is not ok.
 * @param response the Response to be parsed
 * @returns the response.json method that accepts a type or Zod schema for a typed json response
 */
const getJson: GetJson =
  (response) =>
  async <T = unknown>(schema?: Schema<T>) => {
    const json = await response.json()
    return schema ? schema.parse(json) : (json as T)
  }

/**
 * @param response the Response to be parsed
 * @returns the response.text method that accepts a type or Zod schema for a typed response
 */
const getText: GetText =
  (response) =>
  async <T extends string = string>(schema?: Schema<T>) => {
    const text = await response.text()
    return schema ? schema.parse(text) : (text as T)
  }

export { getJson, getText }
