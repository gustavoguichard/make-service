import type { StandardSchemaV1 } from 'zod/lib/standard-schema'
import type { GetJson, GetText } from './types'

/**
 * It returns the JSON object or throws an error if the response is not ok.
 * @param response the Response to be parsed
 * @returns the response.json method that accepts a type or Zod schema for a typed json response
 */
const getJson: GetJson =
  (response) =>
    async <T = unknown>(schema?: StandardSchemaV1<T>) => {
      const json = await response.json()
      if (!schema) return json as T
      const result = await schema['~standard'].validate(json)
      if (result.issues) throw new Error(result.issues[0].message)
      return result.value
    }

/**
 * @param response the Response to be parsed
 * @returns the response.text method that accepts a type or Zod schema for a typed response
 */
const getText: GetText =
  (response) =>
    async <T extends string = string>(schema?: StandardSchemaV1<T>) => {
      const text = await response.text()
      if (!schema) return text as T
      const result = await schema['~standard'].validate(text)
      if (result.issues) throw new Error(result.issues[0].message)
      return result.value
    }

export { getJson, getText }
