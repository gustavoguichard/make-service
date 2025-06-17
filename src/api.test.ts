import { type } from 'arktype'
import { deepCamelKeys } from 'string-ts'
import { z } from 'zod'
import * as subject from './api'
import { HTTP_METHODS } from './constants'
import { ParseResponseError } from './primitives'
import type { HTTPMethod } from './types'

const reqMock = vi.fn()
function successfulFetch(response: string | Record<string, unknown>) {
  return async (input: URL | RequestInfo, init?: RequestInit | undefined) => {
    reqMock({
      url: input,
      headers: init?.headers,
      method: init?.method,
      body: init?.body,
    })
    return new Response(
      typeof response === 'string' ? response : JSON.stringify(response)
    )
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('enhancedFetch', () => {
  describe('json', () => {
    it('should be untyped by default', async () => {
      vi.spyOn(global, 'fetch').mockImplementationOnce(
        successfulFetch({ foo: 'bar' })
      )
      const result = await subject
        .enhancedFetch('https://example.com/api/users')
        .then((r) => r.json())
      type _R = Expect<Equal<typeof result, unknown>>
      expect(result).toEqual({ foo: 'bar' })
    })

    it('should accept a type', async () => {
      vi.spyOn(global, 'fetch').mockImplementationOnce(
        successfulFetch({ foo: 'bar' })
      )
      const result = await subject
        .enhancedFetch('https://example.com/api/users')
        .then((r) => r.json<{ foo: string }>())
      type _R = Expect<Equal<typeof result, { foo: string }>>
      expect(result).toEqual({ foo: 'bar' })
    })

    it('should accept a parser', async () => {
      vi.spyOn(global, 'fetch').mockImplementationOnce(
        successfulFetch({ foo: 'bar' })
      )
      const result = await subject
        .enhancedFetch('https://example.com/api/users')
        .then((r) => r.json(z.object({ foo: z.string() })))
      type _R = Expect<Equal<typeof result, { foo: string }>>
      expect(result).toEqual({ foo: 'bar' })
    })
  })

  describe('text', () => {
    it('should be untyped by default', async () => {
      vi.spyOn(global, 'fetch').mockImplementationOnce(
        successfulFetch({ foo: 'bar' })
      )
      const result = await subject
        .enhancedFetch('https://example.com/api/users')
        .then((r) => r.text())
      type _R = Expect<Equal<typeof result, string>>
      expect(result).toEqual(`{"foo":"bar"}`)
    })

    it('should accept a type', async () => {
      vi.spyOn(global, 'fetch').mockImplementationOnce(
        successfulFetch('john@doe.com')
      )
      const result = await subject
        .enhancedFetch('https://example.com/api/users')
        .then((r) => r.text<`${string}@${string}.${string}`>())
      type _R = Expect<Equal<typeof result, `${string}@${string}.${string}`>>
      expect(result).toEqual('john@doe.com')
    })

    it('should accept a parser', async () => {
      vi.spyOn(global, 'fetch').mockImplementationOnce(
        successfulFetch('john@doe.com')
      )
      const result = await subject
        .enhancedFetch('https://example.com/api/users')
        .then((r) => r.text(z.string().email()))
      type _R = Expect<Equal<typeof result, string>>
      expect(result).toEqual('john@doe.com')
    })
  })

  it('should accept a schema that transforms the response', async () => {
    vi.spyOn(global, 'fetch').mockImplementationOnce(
      successfulFetch({ foo: { 'deep-nested': { 'kind-of-value': true } } })
    )
    const parsedResult = await subject
      .enhancedFetch('https://example.com/api/users')
      .then((r) =>
        r.json(
          z.object({
            foo: z.object({
              'deep-nested': z.object({ 'kind-of-value': z.boolean() }),
            }),
          })
        )
      )
    const result = deepCamelKeys(parsedResult)
    type _R = Expect<
      Equal<typeof result, { foo: { deepNested: { kindOfValue: boolean } } }>
    >
    expect(result).toEqual({ foo: { deepNested: { kindOfValue: true } } })
  })

  it('should replace params in the URL', async () => {
    vi.spyOn(global, 'fetch').mockImplementationOnce(
      successfulFetch({ foo: 'bar' })
    )
    await subject.enhancedFetch(
      'https://example.com/api/users/:user/page/:page',
      {
        params: {
          user: '1',
          page: '2',
          // @ts-expect-error argument not infered from URL
          foo: 'bar',
        },
      }
    )
    expect(reqMock).toHaveBeenCalledWith({
      url: 'https://example.com/api/users/1/page/2',
    })
  })

  it('should accept a requestInit and a query', async () => {
    vi.spyOn(global, 'fetch').mockImplementationOnce(
      successfulFetch({ foo: 'bar' })
    )
    await subject.enhancedFetch('https://example.com/api/users', {
      headers: { Authorization: 'Bearer 123' },
      query: { admin: 'true' },
    })
    expect(reqMock).toHaveBeenCalledWith({
      url: 'https://example.com/api/users?admin=true',
      headers: { Authorization: 'Bearer 123' },
    })
  })

  it('should accept a stringified body', async () => {
    vi.spyOn(global, 'fetch').mockImplementationOnce(
      successfulFetch({ foo: 'bar' })
    )
    await subject.enhancedFetch('https://example.com/api/users', {
      body: JSON.stringify({ id: 1, name: { first: 'John', last: 'Doe' } }),
      method: 'POST',
    })
    expect(reqMock).toHaveBeenCalledWith({
      url: 'https://example.com/api/users',
      method: 'POST',
      body: `{"id":1,"name":{"first":"John","last":"Doe"}}`,
    })
  })

  it('should stringify the body', async () => {
    vi.spyOn(global, 'fetch').mockImplementationOnce(
      successfulFetch({ foo: 'bar' })
    )
    await subject.enhancedFetch('https://example.com/api/users', {
      body: { id: 1, name: { first: 'John', last: 'Doe' } },
      method: 'POST',
    })
    expect(reqMock).toHaveBeenCalledWith({
      url: 'https://example.com/api/users',
      method: 'POST',
      body: `{"id":1,"name":{"first":"John","last":"Doe"}}`,
    })
  })

  it('should accept a trace function for debugging purposes', async () => {
    const trace = vi.fn()
    vi.spyOn(global, 'fetch').mockImplementationOnce(
      successfulFetch({ foo: 'bar' })
    )
    await subject.enhancedFetch('https://example.com/api/users', {
      body: { id: 1, name: { first: 'John', last: 'Doe' } },
      query: { admin: 'true' },
      trace,
      method: 'POST',
    })
    expect(trace).toHaveBeenCalledWith(
      'https://example.com/api/users?admin=true',
      {
        method: 'POST',
        body: `{"id":1,"name":{"first":"John","last":"Doe"}}`,
      },
      expect.any(Response)
    )
  })

  it('should return some result from other Response methods', async () => {
    const response = await subject.enhancedFetch('data:text/plain;,foo')
    const blob = await response.blob()
    expect(await blob.text()).toEqual('foo')
  })
})

describe('makeFetcher', () => {
  it('should return an applied enhancedFetch', async () => {
    vi.spyOn(global, 'fetch').mockImplementationOnce(
      successfulFetch({ foo: 'bar' })
    )
    const service = subject.makeFetcher('https://example.com/api')
    const result = await service('/users', { method: 'post' }).then((r) =>
      r.json(z.object({ foo: z.string() }))
    )
    type _R = Expect<Equal<typeof result, { foo: string }>>

    expect(result).toEqual({ foo: 'bar' })
    expect(reqMock).toHaveBeenCalledWith({
      url: 'https://example.com/api/users',
      method: 'post',
      headers: new Headers(),
    })
  })

  it('should add headers to the request', async () => {
    vi.spyOn(global, 'fetch').mockImplementationOnce(
      successfulFetch({ foo: 'bar' })
    )
    const fetcher = subject.makeFetcher('https://example.com/api', {
      headers: {
        Authorization: 'Bearer 123',
      },
    })
    await fetcher('/users', { headers: { 'Content-type': 'application/json' } })
    expect(reqMock).toHaveBeenCalledWith({
      url: 'https://example.com/api/users',
      headers: new Headers({
        authorization: 'Bearer 123',
        'content-type': 'application/json',
      }),
    })
  })

  it('should transform the request', async () => {
    vi.spyOn(global, 'fetch').mockImplementationOnce(
      successfulFetch({ foo: 'bar' })
    )
    const fetcher = subject.makeFetcher('https://example.com/api', {
      headers: {
        Authorization: 'Bearer 123',
      },
      requestTransformer: (request) => ({ ...request, query: { foo: 'bar' } }),
    })
    await fetcher('/users')
    expect(reqMock).toHaveBeenCalledWith({
      url: 'https://example.com/api/users?foo=bar',
      headers: new Headers({ authorization: 'Bearer 123' }),
    })
  })

  it('should transform the response', async () => {
    vi.spyOn(global, 'fetch').mockImplementationOnce(
      successfulFetch({ foo: 'bar' })
    )
    const fetcher = subject.makeFetcher('https://example.com/api', {
      headers: {
        Authorization: 'Bearer 123',
      },
      responseTransformer: (response) => ({
        ...response,
        statusText: 'Foo Bar',
      }),
    })
    const response = await fetcher('/users')
    expect(response.statusText).toEqual('Foo Bar')
    expect(reqMock).toHaveBeenCalledWith({
      url: 'https://example.com/api/users',
      headers: new Headers({ authorization: 'Bearer 123' }),
    })
  })

  it('should accept a typed params object', async () => {
    vi.spyOn(global, 'fetch').mockImplementationOnce(
      successfulFetch({ foo: 'bar' })
    )
    const fetcher = subject.makeFetcher('https://example.com/api')
    await fetcher('/users/:id', {
      params: {
        id: '1',
        // @ts-expect-error argument not infered from URL
        foo: 'bar',
      },
    })
    expect(reqMock).toHaveBeenCalledWith({
      url: 'https://example.com/api/users/1',
      headers: new Headers(),
    })
  })

  it('should accept a function for dynamic headers', async () => {
    vi.spyOn(global, 'fetch').mockImplementationOnce(
      successfulFetch({ foo: 'bar' })
    )
    const fetcher = subject.makeFetcher('https://example.com/api', {
      headers: () => ({
        Authorization: 'Bearer 123',
      }),
    })
    await fetcher('/users')
    expect(reqMock).toHaveBeenCalledWith({
      url: 'https://example.com/api/users',
      headers: new Headers({ authorization: 'Bearer 123' }),
    })
  })

  it('should accept an async function for dynamic headers', async () => {
    vi.spyOn(global, 'fetch').mockImplementationOnce(
      successfulFetch({ foo: 'bar' })
    )
    const fetcher = subject.makeFetcher('https://example.com/api', {
      headers: async () => ({
        Authorization: 'Bearer 123',
      }),
    })
    await fetcher('/users', {
      headers: new Headers({ 'content-type': 'application/json' }),
    })
    expect(reqMock).toHaveBeenCalledWith({
      url: 'https://example.com/api/users',
      headers: new Headers({
        authorization: 'Bearer 123',
        'content-type': 'application/json',
      }),
    })
  })

  it('should accept a query, trace, and JSON-like body', async () => {
    const trace = vi.fn()
    vi.spyOn(global, 'fetch').mockImplementationOnce(
      successfulFetch({ foo: 'bar' })
    )
    const fetcher = subject.makeFetcher('https://example.com/api')
    await fetcher('/users', {
      method: 'POST',
      body: { id: 1, name: { first: 'John', last: 'Doe' } },
      query: { admin: 'true' },
      trace,
    })
    expect(trace).toHaveBeenCalledWith(
      'https://example.com/api/users?admin=true',
      {
        method: 'POST',
        body: `{"id":1,"name":{"first":"John","last":"Doe"}}`,
        headers: new Headers(),
      },
      expect.any(Response)
    )
  })
})

describe('makeService', () => {
  it('should return an object with http methods', () => {
    const service = subject.makeService('https://example.com/api')
    for (const method of HTTP_METHODS) {
      expect(
        typeof service[method.toLocaleLowerCase() as Lowercase<HTTPMethod>]
      ).toBe('function')
    }
  })

  it('should return an API with enhancedFetch', async () => {
    vi.spyOn(global, 'fetch').mockImplementationOnce(
      successfulFetch({ foo: 'bar' })
    )
    const service = subject.makeService('https://example.com/api')
    const result = await service
      .post('/users')
      .then((r) => r.json(z.object({ foo: z.string() })))
    type _R = Expect<Equal<typeof result, { foo: string }>>

    expect(result).toEqual({ foo: 'bar' })
    expect(reqMock).toHaveBeenCalledWith({
      url: 'https://example.com/api/users',
      method: 'POST',
      headers: new Headers(),
    })
  })

  it('should accept a typed params object', async () => {
    vi.spyOn(global, 'fetch').mockImplementationOnce(
      successfulFetch({ foo: 'bar' })
    )
    const service = subject.makeService('https://example.com/api')
    await service.get('/users/:id', {
      params: {
        id: '1',
        // @ts-expect-error argument not infered from URL
        foo: 'bar',
      },
    })
    expect(reqMock).toHaveBeenCalledWith({
      url: 'https://example.com/api/users/1',
      method: 'GET',
      headers: new Headers(),
    })
  })
})

describe('typedResponse', () => {
  it('should return unknown by default when turning into a JSON', async () => {
    const result = await subject.typedResponse(new Response('1')).json()
    type _R = Expect<Equal<typeof result, unknown>>
    expect(result).toEqual(1)
  })

  it('should accept a type for the JSON method', async () => {
    const result = await subject
      .typedResponse(new Response(`{"foo":"bar"}`))
      .json<{ foo: string }>()
    type _R = Expect<Equal<typeof result, { foo: string }>>
    expect(result).toEqual({ foo: 'bar' })
  })

  it('should accept a parser for the JSON method', async () => {
    const result = await subject
      .typedResponse(new Response(`{"foo":"bar"}`))
      .json(z.object({ foo: z.string() }))
    type _R = Expect<Equal<typeof result, { foo: string }>>
    expect(result).toEqual({ foo: 'bar' })
  })

  it('should accept other parsers, such as arktype for the JSON method', async () => {
    const result = await subject
      .typedResponse(new Response(`{"foo":"bar"}`))
      .json(type({ foo: 'string' }))
    type _R = Expect<Equal<typeof result, { foo: string }>>
    expect(result).toEqual({ foo: 'bar' })
  })

  it('should throw a ParseResponseError when the JSON does not match the parser', async () => {
    const response = new Response(`{"foo":1}`)
    try {
      await subject.typedResponse(response).json(z.object({ foo: z.string() }))
    } catch (error) {
      if (!(error instanceof ParseResponseError)) throw error

      expect(error).toBeInstanceOf(ParseResponseError)
      expect(error.message).toContain(
        `"message": "Failed to parse response.json"`
      )
      expect(error.issues).toMatchObject([
        {
          message: 'Expected string, received number',
          path: ['foo'],
        },
      ])
    }
  })

  it('should return string by default when turning into text', async () => {
    const result = await subject.typedResponse(new Response('foo')).text()
    type _R = Expect<Equal<typeof result, string>>
    expect(result).toBe('foo')
  })

  it('should accept a type for the text method', async () => {
    const result = await subject
      .typedResponse(new Response('john@doe.com'))
      .text<`${string}@${string}.${string}`>()
    type _R = Expect<Equal<typeof result, `${string}@${string}.${string}`>>
    expect(result).toBe('john@doe.com')
  })

  it('should accept a parser for the text method', async () => {
    const result = await subject
      .typedResponse(new Response('john@doe.com'))
      .text(z.string().email())
    type _R = Expect<Equal<typeof result, string>>
    expect(result).toBe('john@doe.com')
  })

  it('should throw a ParseResponseError when the text does not match the parser', async () => {
    const response = new Response('not an email')
    try {
      await subject.typedResponse(response).text(z.string().email())
    } catch (error) {
      if (!(error instanceof ParseResponseError)) throw error

      expect(error).toBeInstanceOf(ParseResponseError)
      expect(error.message).toContain(
        `"message": "Failed to parse response.text"`
      )
      expect(error.issues.length).toBeGreaterThan(0)
    }
  })
})
