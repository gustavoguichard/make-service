import { HTTP_METHODS } from './constants'
import * as subject from './api'
import * as z from 'zod'
import { HTTPMethod } from './types'
import { kebabToCamel } from './transforms'

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
      typeof response === 'string' ? response : JSON.stringify(response),
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
        successfulFetch({ foo: 'bar' }),
      )
      const result = await subject
        .enhancedFetch('https://example.com/api/users')
        .then((r) => r.json())
      type _R = Expect<Equal<typeof result, unknown>>
      expect(result).toEqual({ foo: 'bar' })
    })

    it('should accept a type', async () => {
      vi.spyOn(global, 'fetch').mockImplementationOnce(
        successfulFetch({ foo: 'bar' }),
      )
      const result = await subject
        .enhancedFetch('https://example.com/api/users')
        .then((r) => r.json<{ foo: string }>())
      type _R = Expect<Equal<typeof result, { foo: string }>>
      expect(result).toEqual({ foo: 'bar' })
    })

    it('should accept a parser', async () => {
      vi.spyOn(global, 'fetch').mockImplementationOnce(
        successfulFetch({ foo: 'bar' }),
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
        successfulFetch({ foo: 'bar' }),
      )
      const result = await subject
        .enhancedFetch('https://example.com/api/users')
        .then((r) => r.text())
      type _R = Expect<Equal<typeof result, string>>
      expect(result).toEqual(`{"foo":"bar"}`)
    })

    it('should accept a type', async () => {
      vi.spyOn(global, 'fetch').mockImplementationOnce(
        successfulFetch('john@doe.com'),
      )
      const result = await subject
        .enhancedFetch('https://example.com/api/users')
        .then((r) => r.text<`${string}@${string}.${string}`>())
      type _R = Expect<Equal<typeof result, `${string}@${string}.${string}`>>
      expect(result).toEqual('john@doe.com')
    })

    it('should accept a parser', async () => {
      vi.spyOn(global, 'fetch').mockImplementationOnce(
        successfulFetch('john@doe.com'),
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
      successfulFetch({ foo: { 'deep-nested': { 'kind-of-value': true } } }),
    )
    const result = await subject
      .enhancedFetch('https://example.com/api/users')
      .then((r) =>
        r.json(
          z
            .object({
              foo: z.object({
                'deep-nested': z.object({ 'kind-of-value': z.boolean() }),
              }),
            })
            .transform(kebabToCamel),
        ),
      )
    type _R = Expect<
      Equal<typeof result, { foo: { deepNested: { kindOfValue: boolean } } }>
    >
    expect(result).toEqual({ foo: { deepNested: { kindOfValue: true } } })
  })

  it('should replace params in the URL', async () => {
    vi.spyOn(global, 'fetch').mockImplementationOnce(
      successfulFetch({ foo: 'bar' }),
    )
    await subject.enhancedFetch(
      'https://example.com/api/users/:user/page/:page',
      {
        params: { user: '1', page: '2', foo: 'bar' },
      },
    )
    expect(reqMock).toHaveBeenCalledWith({
      url: 'https://example.com/api/users/1/page/2',
      headers: new Headers({
        'content-type': 'application/json',
      }),
    })
  })

  it('should accept a requestInit and a query', async () => {
    vi.spyOn(global, 'fetch').mockImplementationOnce(
      successfulFetch({ foo: 'bar' }),
    )
    await subject.enhancedFetch('https://example.com/api/users', {
      headers: { Authorization: 'Bearer 123' },
      query: { admin: 'true' },
    })
    expect(reqMock).toHaveBeenCalledWith({
      url: 'https://example.com/api/users?admin=true',
      headers: new Headers({
        authorization: 'Bearer 123',
        'content-type': 'application/json',
      }),
    })
  })

  it('should accept a stringified body', async () => {
    vi.spyOn(global, 'fetch').mockImplementationOnce(
      successfulFetch({ foo: 'bar' }),
    )
    await subject.enhancedFetch('https://example.com/api/users', {
      body: JSON.stringify({ id: 1, name: { first: 'John', last: 'Doe' } }),
      method: 'POST',
    })
    expect(reqMock).toHaveBeenCalledWith({
      url: 'https://example.com/api/users',
      headers: new Headers({ 'content-type': 'application/json' }),
      method: 'POST',
      body: `{"id":1,"name":{"first":"John","last":"Doe"}}`,
    })
  })

  it('should stringify the body', async () => {
    vi.spyOn(global, 'fetch').mockImplementationOnce(
      successfulFetch({ foo: 'bar' }),
    )
    await subject.enhancedFetch('https://example.com/api/users', {
      body: { id: 1, name: { first: 'John', last: 'Doe' } },
      method: 'POST',
    })
    expect(reqMock).toHaveBeenCalledWith({
      url: 'https://example.com/api/users',
      headers: new Headers({ 'content-type': 'application/json' }),
      method: 'POST',
      body: `{"id":1,"name":{"first":"John","last":"Doe"}}`,
    })
  })

  it('should accept a trace function for debugging purposes', async () => {
    const trace = vi.fn()
    vi.spyOn(global, 'fetch').mockImplementationOnce(
      successfulFetch({ foo: 'bar' }),
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
        headers: new Headers({ 'content-type': 'application/json' }),
        method: 'POST',
        body: `{"id":1,"name":{"first":"John","last":"Doe"}}`,
      },
    )
  })
})

describe('makeFetcher', () => {
  it('should return a applied enhancedFetch', async () => {
    vi.spyOn(global, 'fetch').mockImplementationOnce(
      successfulFetch({ foo: 'bar' }),
    )
    const service = subject.makeFetcher('https://example.com/api')
    const result = await service('/users', { method: 'post' }).then((r) =>
      r.json(z.object({ foo: z.string() })),
    )
    type _R = Expect<Equal<typeof result, { foo: string }>>
    expect(result).toEqual({ foo: 'bar' })
    expect(reqMock).toHaveBeenCalledWith({
      url: 'https://example.com/api/users',
      headers: new Headers({ 'content-type': 'application/json' }),
      method: 'post',
    })
  })

  it('should add headers to the request', async () => {
    vi.spyOn(global, 'fetch').mockImplementationOnce(
      successfulFetch({ foo: 'bar' }),
    )
    const service = subject.makeFetcher('https://example.com/api', {
      Authorization: 'Bearer 123',
    })
    await service('/users')
    expect(reqMock).toHaveBeenCalledWith({
      url: 'https://example.com/api/users',
      headers: new Headers({
        authorization: 'Bearer 123',
        'content-type': 'application/json',
      }),
    })
  })

  it('should accept a function for dynamic headers', async () => {
    vi.spyOn(global, 'fetch').mockImplementationOnce(
      successfulFetch({ foo: 'bar' }),
    )
    const service = subject.makeFetcher('https://example.com/api', () => ({
      Authorization: 'Bearer 123',
    }))
    await service('/users')
    expect(reqMock).toHaveBeenCalledWith({
      url: 'https://example.com/api/users',
      headers: new Headers({
        authorization: 'Bearer 123',
        'content-type': 'application/json',
      }),
    })
  })

  it('should accept an async function for dynamic headers', async () => {
    vi.spyOn(global, 'fetch').mockImplementationOnce(
      successfulFetch({ foo: 'bar' }),
    )
    const service = subject.makeFetcher(
      'https://example.com/api',
      async () => ({
        Authorization: 'Bearer 123',
      }),
    )
    await service('/users')
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
      successfulFetch({ foo: 'bar' }),
    )
    const service = subject.makeFetcher('https://example.com/api')
    await service('/users', {
      method: 'POST',
      body: { id: 1, name: { first: 'John', last: 'Doe' } },
      query: { admin: 'true' },
      trace,
    })
    expect(trace).toHaveBeenCalledWith(
      'https://example.com/api/users?admin=true',
      {
        headers: new Headers({ 'content-type': 'application/json' }),
        method: 'POST',
        body: `{"id":1,"name":{"first":"John","last":"Doe"}}`,
      },
    )
  })
})

describe('makeService', () => {
  it('should return an object with http methods', () => {
    const service = subject.makeService('https://example.com/api')
    for (const method of HTTP_METHODS) {
      expect(
        typeof service[method.toLocaleLowerCase() as Lowercase<HTTPMethod>],
      ).toBe('function')
    }
  })

  it('should return an API with enhancedFetch', async () => {
    vi.spyOn(global, 'fetch').mockImplementationOnce(
      successfulFetch({ foo: 'bar' }),
    )
    const service = subject.makeService('https://example.com/api')
    const result = await service
      .post('/users')
      .then((r) => r.json(z.object({ foo: z.string() })))
    type _R = Expect<Equal<typeof result, { foo: string }>>
    expect(result).toEqual({ foo: 'bar' })
    expect(reqMock).toHaveBeenCalledWith({
      url: 'https://example.com/api/users',
      headers: new Headers({ 'content-type': 'application/json' }),
      method: 'POST',
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
})
