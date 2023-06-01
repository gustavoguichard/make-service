import { z } from 'zod'
import { typedResponse } from './api'
import type * as Subject from './transforms'
import * as subject from './transforms'

namespace TypeTransforms {
  type test1 = Expect<
    Equal<Subject.CamelToKebab<'camelToKebab'>, 'camel-to-kebab'>
  >
  type test2 = Expect<
    Equal<Subject.CamelToSnake<'camelToSnake'>, 'camel_to_snake'>
  >
  type test3 = Expect<
    Equal<Subject.KebabToCamel<'kebab-to-camel'>, 'kebabToCamel'>
  >
  type test4 = Expect<
    Equal<Subject.KebabToSnake<'kebab-to-snake'>, 'kebab_to_snake'>
  >
  type test5 = Expect<
    Equal<Subject.SnakeToCamel<'snake_to_camel'>, 'snakeToCamel'>
  >
  type test6 = Expect<
    Equal<Subject.SnakeToKebab<'snake_to_kebab'>, 'snake-to-kebab'>
  >
}

describe('deep transforms', () => {
  test('camelToKebab', () => {
    const result = subject.camelToKebab({
      some: { deepNested: { value: true } },
      otherValue: true,
    })
    expect(result).toEqual({
      some: { 'deep-nested': { value: true } },
      'other-value': true,
    })
    type test = Expect<
      Equal<
        typeof result,
        { some: { 'deep-nested': { value: boolean } }; 'other-value': boolean }
      >
    >
  })

  test('camelToSnake', () => {
    const result = subject.camelToSnake({
      some: { deepNested: { value: true } },
      otherValue: true,
    })
    expect(result).toEqual({
      some: { deep_nested: { value: true } },
      other_value: true,
    })
    type test = Expect<
      Equal<
        typeof result,
        { some: { deep_nested: { value: boolean } }; other_value: boolean }
      >
    >
  })

  test('kebabToCamel', () => {
    const result = subject.kebabToCamel({
      some: { 'deep-nested': { value: true } },
      'other-value': true,
    })
    expect(result).toEqual({
      some: { deepNested: { value: true } },
      otherValue: true,
    })
    type test = Expect<
      Equal<
        typeof result,
        { some: { deepNested: { value: boolean } }; otherValue: boolean }
      >
    >
  })

  test('kebabToSnake', () => {
    const result = subject.kebabToSnake({
      some: { 'deep-nested': { value: true } },
      'other-value': true,
    })
    expect(result).toEqual({
      some: { deep_nested: { value: true } },
      other_value: true,
    })
    type test = Expect<
      Equal<
        typeof result,
        { some: { deep_nested: { value: boolean } }; other_value: boolean }
      >
    >
  })

  test('snakeToCamel', () => {
    const result = subject.snakeToCamel({
      some: { deep_nested: { value: true } },
      other_value: true,
    })
    expect(result).toEqual({
      some: { deepNested: { value: true } },
      otherValue: true,
    })
    type test = Expect<
      Equal<
        typeof result,
        { some: { deepNested: { value: boolean } }; otherValue: boolean }
      >
    >
  })

  test('snakeToKebab', () => {
    const result = subject.snakeToKebab({
      some: { deep_nested: { value: true } },
      other_value: true,
    })
    expect(result).toEqual({
      some: { 'deep-nested': { value: true } },
      'other-value': true,
    })
    type test = Expect<
      Equal<
        typeof result,
        { some: { 'deep-nested': { value: boolean } }; 'other-value': boolean }
      >
    >
  })

  test('should transform deep nested objects and array of objects', () => {
    const result = subject.kebabToCamel([
      { some: { 'deep-nested': [{ value: true }] } },
    ])
    expect(result).toEqual([{ some: { deepNested: [{ value: true }] } }])
    type test = Expect<
      Equal<typeof result, { some: { deepNested: { value: boolean }[] } }[]>
    >
  })
})

describe('makeRequestTransformer', () => {
  test('with query and body objects', async () => {
    const transformer = subject.makeRequestTransformer((key) =>
      key.toUpperCase(),
    )

    const requestInit = await transformer({
      query: { myQuery: 'foo' },
      body: { some: { deepNested: { value: true } }, otherValue: true },
    })

    expect(requestInit.body).toEqual({
      SOME: { DEEPNESTED: { VALUE: true } },
      OTHERVALUE: true,
    })

    expect(requestInit.query).toEqual({ MYQUERY: 'foo' })
  })

  test('with array of tuples query', async () => {
    const transformer = subject.makeRequestTransformer((key) =>
      key.toUpperCase(),
    )

    const requestInit = await transformer({
      query: [
        ['foo', '1'],
        ['bar', '2'],
      ],
    })

    expect(requestInit.query).toEqual([
      ['FOO', '1'],
      ['BAR', '2'],
    ])
  })

  test('with URLSearchParams query', async () => {
    const transformer = subject.makeRequestTransformer((key) =>
      key.toUpperCase(),
    )

    const query = new URLSearchParams([
      ['first', 'foo'],
      ['first', 'bar'],
      ['last', 'zoo'],
    ])

    const requestInit = await transformer({ query })

    expect(requestInit.query).toEqual(
      new URLSearchParams([
        ['FIRST', 'foo'],
        ['FIRST', 'bar'],
        ['LAST', 'zoo'],
      ]),
    )
  })

  test('with string query', async () => {
    const transformer = subject.makeRequestTransformer((key) =>
      key.toUpperCase(),
    )

    const requestInit = await transformer({ query: 'myQuery=foo' })
    expect(requestInit.query).toEqual('MYQUERY=foo')
  })

  test('with URLSearchParams body', async () => {
    const transformer = subject.makeRequestTransformer((key) =>
      key.toUpperCase(),
    )

    const body = new URLSearchParams([
      ['first', 'foo'],
      ['first', 'bar'],
      ['last', 'zoo'],
    ])

    const requestInit = await transformer({ body })

    expect(requestInit.body).toEqual(
      new URLSearchParams([
        ['FIRST', 'foo'],
        ['FIRST', 'bar'],
        ['LAST', 'zoo'],
      ]),
    )
  })

  test('with FormData body', async () => {
    const transformer = subject.makeRequestTransformer((key) =>
      key.toUpperCase(),
    )

    const body = new FormData()
    body.append('first', 'foo')
    body.append('first', 'bar')
    body.append('last', 'zoo')

    const requestInit = await transformer({ body })

    const formData = new FormData()
    formData.append('FIRST', 'foo')
    formData.append('FIRST', 'bar')
    formData.append('LAST', 'zoo')

    expect(requestInit.body).toEqual(formData)
  })

  test('with ReadableStream body', async () => {
    const transformer = subject.makeRequestTransformer((key) =>
      key.toUpperCase(),
    )

    const body = new ReadableStream()
    const requestInit = await transformer({ body })
    expect(requestInit.body).toEqual(body)
  })

  test('with Blob body', async () => {
    const transformer = subject.makeRequestTransformer((key) =>
      key.toUpperCase(),
    )

    const body = new Blob()
    const requestInit = await transformer({ body })
    expect(requestInit.body).toEqual(body)
  })

  test('with ArrayBuffer body', async () => {
    const transformer = subject.makeRequestTransformer((key) =>
      key.toUpperCase(),
    )

    const body = new ArrayBuffer(1)
    const requestInit = await transformer({ body })
    expect(requestInit.body).toEqual(body)
  })
})

describe('kebabRequest', () => {
  test('with query and body objects', async () => {
    const requestInit = await subject.kebabRequest({
      query: { myQuery: 'foo' },
      body: { some: { deepNested: { value: true } }, otherValue: true },
    })

    expect(requestInit.body).toEqual({
      some: { 'deep-nested': { value: true } },
      'other-value': true,
    })

    expect(requestInit.query).toEqual({ 'my-query': 'foo' })
  })
})

describe('snakeRequest', () => {
  test('with query and body objects', async () => {
    const requestInit = await subject.snakeRequest({
      query: { myQuery: 'foo' },
      body: { some: { deepNested: { value: true } }, otherValue: true },
    })

    expect(requestInit.body).toEqual({
      some: { deep_nested: { value: true } },
      other_value: true,
    })

    expect(requestInit.query).toEqual({ my_query: 'foo' })
  })
})

describe('camelRequest', () => {
  test('with query and body objects', async () => {
    const requestInit = await subject.camelRequest({
      query: { my_query: 'foo' },
      body: { some: { deep_nested: { value: true } }, other_value: true },
    })

    expect(requestInit.body).toEqual({
      some: { deepNested: { value: true } },
      otherValue: true,
    })

    expect(requestInit.query).toEqual({ myQuery: 'foo' })
  })
})

describe('makeResponseTransformer', () => {
  test('without a schema', async () => {
    const transformer = subject.makeResponseTransformer((key) =>
      key.toUpperCase(),
    )

    const body = { some: { deepNested: { value: true } }, otherValue: true }
    const original = typedResponse(new Response(JSON.stringify(body)))
    const response = await transformer(original)

    expect(await response.json()).toEqual({
      SOME: { DEEPNESTED: { VALUE: true } },
      OTHERVALUE: true,
    })
  })

  test('with a schema', async () => {
    const transformer = subject.makeResponseTransformer((key) =>
      key.toUpperCase(),
    )

    const body = { some: { deepNested: { value: true } }, otherValue: true }
    const original = typedResponse(new Response(JSON.stringify(body)))
    const response = await transformer(original)

    const schema = z.object({
      SOME: z.object({ DEEPNESTED: z.object({ VALUE: z.boolean() }) }),
    })

    expect(await response.json(schema)).toEqual({
      SOME: { DEEPNESTED: { VALUE: true } },
    })
  })
})

describe('kebabResponse', () => {
  test('with query and body objects', async () => {
    const body = { some: { deepNested: { value: true } }, otherValue: true }
    const original = typedResponse(new Response(JSON.stringify(body)))
    const response = await subject.kebabResponse(original)

    expect(await response.json()).toEqual({
      some: { 'deep-nested': { value: true } },
      'other-value': true,
    })
  })
})

describe('snakeResponse', () => {
  test('with query and body objects', async () => {
    const body = { some: { deepNested: { value: true } }, otherValue: true }
    const original = typedResponse(new Response(JSON.stringify(body)))
    const response = await subject.snakeResponse(original)

    expect(await response.json()).toEqual({
      some: { deep_nested: { value: true } },
      other_value: true,
    })
  })
})

describe('camelResponse', () => {
  test('with query and body objects', async () => {
    const body = { some: { deep_nested: { value: true } }, other_value: true }
    const original = typedResponse(new Response(JSON.stringify(body)))
    const response = await subject.camelResponse(original)

    expect(await response.json()).toEqual({
      some: { deepNested: { value: true } },
      otherValue: true,
    })
  })
})
