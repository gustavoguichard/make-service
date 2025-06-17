import type { StandardSchemaV1 } from '@standard-schema/spec'
import { ParseResponseError } from './primitives'
import type { GetJson, GetText } from './types'

/**
 * It returns the JSON object or throws an error if the response is not ok.
 * @param response the Response to be parsed
 * @returns the response.json method that accepts a type or Zod schema for a typed json response
 */
const getJson: GetJson =
  (response) =>
  async <Input = unknown, Output = Input>(
    schema?: StandardSchemaV1<Input, Output>
  ) => {
    const json = await response.json()
    if (!schema) return json as Output
    const result = await schema['~standard'].validate(json)
    if (result.issues) {
      throw new ParseResponseError(
        'Failed to parse response.json',
        result.issues
      )
    }
    return result.value
  }

/**
 * @param response the Response to be parsed
 * @returns the response.text method that accepts a type or Zod schema for a typed response
 */
const getText: GetText =
  (response) =>
  async <Input extends string = string, Output = Input>(
    schema?: StandardSchemaV1<Input, Output>
  ) => {
    const text = await response.text()
    if (!schema) return text as Output
    const result = await schema['~standard'].validate(text)
    if (result.issues) {
      throw new ParseResponseError(
        'Failed to parse response.text',
        result.issues
      )
    }
    return result.value
  }

export { getJson, getText }
