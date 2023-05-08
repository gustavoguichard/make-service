import { HTTP_METHODS } from './constants'
import * as subject from './index'
import * as z from 'zod'

export type Expect<T extends true> = T
export type Equal<A, B> =
  // prettier-ignore
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2)
    ? true
    : false

beforeEach(() => {
  vi.clearAllMocks()
})

describe('mergeHeaders', () => {
  it('should merge diferent kinds of Headers', () => {
    expect(
      subject.mergeHeaders(new Headers({ a: '1' }), { b: '2' }, [['c', '3']]),
    ).toEqual(new Headers({ a: '1', b: '2', c: '3' }))
  })

  it('should merge diferent kinds of Headers and override values', () => {
    expect(
      subject.mergeHeaders(new Headers({ a: '1' }), { a: '2' }, [['a', '3']]),
    ).toEqual(new Headers({ a: '3' }))
  })

  it('should merge diferent kinds of Headers and delete undefined values', () => {
    expect(
      subject.mergeHeaders(new Headers({ a: '1' }), { a: undefined }),
    ).toEqual(new Headers({}))
    expect(
      subject.mergeHeaders(new Headers({ a: '1' }), { a: 'undefined' }),
    ).toEqual(new Headers({}))
    expect(
      subject.mergeHeaders(new Headers({ a: '1' }), [['a', undefined]]),
    ).toEqual(new Headers({}))
  })
})

describe('addQueryToUrl', () => {
  it('should add the query object to a string input', () => {
    expect(subject.addQueryToUrl('https://example.com/api', { id: '1' })).toBe(
      'https://example.com/api?id=1',
    )
    expect(
      subject.addQueryToUrl('https://example.com/api', 'page=2&foo=bar'),
    ).toBe('https://example.com/api?page=2&foo=bar')
  })

  it('should add the query object to a URL input', () => {
    expect(
      subject.addQueryToUrl(new URL('https://example.com/api'), {
        id: '1',
      }),
    ).toEqual(new URL('https://example.com/api?id=1'))
    expect(
      subject.addQueryToUrl(new URL('https://example.com/api'), 'page=2'),
    ).toEqual(new URL('https://example.com/api?page=2'))
  })

  it('should append the query to a URL string that already has QS', () => {
    expect(
      subject.addQueryToUrl('https://example.com/api?id=1', { page: '2' }),
    ).toBe('https://example.com/api?id=1&page=2')
    expect(
      subject.addQueryToUrl('https://example.com/api?id=1', 'page=2'),
    ).toBe('https://example.com/api?id=1&page=2')
    expect(
      subject.addQueryToUrl(
        'https://example.com/api?id=1',
        new URLSearchParams({ page: '2' }),
      ),
    ).toBe('https://example.com/api?id=1&page=2')
  })

  it('should append the query to a URL instance that already has QS', () => {
    expect(
      subject.addQueryToUrl(new URL('https://example.com/api?id=1'), {
        page: '2',
      }),
    ).toEqual(new URL('https://example.com/api?id=1&page=2'))
    expect(
      subject.addQueryToUrl(new URL('https://example.com/api?id=1'), 'page=2'),
    ).toEqual(new URL('https://example.com/api?id=1&page=2'))
    expect(
      subject.addQueryToUrl(
        new URL('https://example.com/api?id=1'),
        new URLSearchParams({ page: '2' }),
      ),
    ).toEqual(new URL('https://example.com/api?id=1&page=2'))
  })

  it("should return the input in case there's no query", () => {
    expect(subject.addQueryToUrl('https://example.com/api')).toBe(
      'https://example.com/api',
    )
    expect(subject.addQueryToUrl(new URL('https://example.com/api'))).toEqual(
      new URL('https://example.com/api'),
    )
  })
})

describe('makeGetApiUrl', () => {
  it('should return a URL which is baseURL and path joined', () => {
    expect(subject.makeGetApiUrl('https://example.com/api')('/users')).toBe(
      'https://example.com/api/users',
    )
  })

  it('should accept an object-like queryString and return it joined to the URL', () => {
    const getApiURL = subject.makeGetApiUrl('https://example.com/api')
    expect(getApiURL('/users', { id: '1' })).toBe(
      'https://example.com/api/users?id=1',
    )
    expect(getApiURL('/users', { active: 'true', page: '2' })).toBe(
      'https://example.com/api/users?active=true&page=2',
    )
  })

  it('should accept a URL as baseURL and remove extra slashes', () => {
    expect(
      subject.makeGetApiUrl(new URL('https://example.com/api'))('/users'),
    ).toBe('https://example.com/api/users')
    expect(
      subject.makeGetApiUrl(new URL('https://example.com/api/'))('/users'),
    ).toBe('https://example.com/api/users')
    expect(
      subject.makeGetApiUrl(new URL('https://example.com/api/'))('///users'),
    ).toBe('https://example.com/api/users')
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

describe('ensureStringBody', () => {
  it('should return the same if body was string', () => {
    expect(subject.ensureStringBody('foo')).toBe('foo')
  })

  it('should return the same if body was not defined', () => {
    expect(subject.ensureStringBody()).toBe(undefined)
  })

  it('should stringify the body if it is a JSON-like value', () => {
    expect(subject.ensureStringBody({ page: 2 })).toBe(`{"page":2}`)
  })
})

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

describe('enhancedFetch', () => {
  describe('proxied json', () => {
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

  describe('proxied text', () => {
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

describe('makeService', () => {
  it('should return an object with http methods', () => {
    const api = subject.makeService('https://example.com/api')
    for (const method of HTTP_METHODS) {
      expect(
        typeof api[method.toLocaleLowerCase() as Lowercase<subject.HTTPMethod>],
      ).toBe('function')
    }
  })

  it('should return an API with enhancedFetch', async () => {
    vi.spyOn(global, 'fetch').mockImplementationOnce(
      successfulFetch({ foo: 'bar' }),
    )
    const api = subject.makeService('https://example.com/api')
    const result = await api
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

  it('should add headers and method to the request', async () => {
    vi.spyOn(global, 'fetch').mockImplementationOnce(
      successfulFetch({ foo: 'bar' }),
    )
    const api = subject.makeService('https://example.com/api', {
      Authorization: 'Bearer 123',
    })
    await api.get('/users')
    expect(reqMock).toHaveBeenCalledWith({
      url: 'https://example.com/api/users',
      headers: new Headers({
        authorization: 'Bearer 123',
        'content-type': 'application/json',
      }),
      method: 'GET',
    })
  })

  it('should accept a function for dynamic headers', async () => {
    vi.spyOn(global, 'fetch').mockImplementationOnce(
      successfulFetch({ foo: 'bar' }),
    )
    const api = subject.makeService('https://example.com/api', () => ({
      Authorization: 'Bearer 123',
    }))
    await api.get('/users')
    expect(reqMock).toHaveBeenCalledWith({
      url: 'https://example.com/api/users',
      headers: new Headers({
        authorization: 'Bearer 123',
        'content-type': 'application/json',
      }),
      method: 'GET',
    })
  })

  it('should accept an async function for dynamic headers', async () => {
    vi.spyOn(global, 'fetch').mockImplementationOnce(
      successfulFetch({ foo: 'bar' }),
    )
    const api = subject.makeService('https://example.com/api', async () => ({
      Authorization: 'Bearer 123',
    }))
    await api.get('/users')
    expect(reqMock).toHaveBeenCalledWith({
      url: 'https://example.com/api/users',
      headers: new Headers({
        authorization: 'Bearer 123',
        'content-type': 'application/json',
      }),
      method: 'GET',
    })
  })

  it('should accept a query, trace, and JSON-like body', async () => {
    const trace = vi.fn()
    vi.spyOn(global, 'fetch').mockImplementationOnce(
      successfulFetch({ foo: 'bar' }),
    )
    const api = subject.makeService('https://example.com/api')
    await api.post('/users', {
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
