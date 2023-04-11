import {
  assertSpyCall,
  spy,
  stub,
} from 'https://deno.land/std@0.180.0/testing/mock.ts'
import { describe, it } from 'https://deno.land/std@0.156.0/testing/bdd.ts'
import { assertEquals } from 'https://deno.land/std@0.160.0/testing/asserts.ts'
import * as subject from './index.ts'
import { z } from 'https://deno.land/x/zod@v3.21.4/mod.ts'
import { HTTP_METHODS } from './constants.ts'

export type Expect<T extends true> = T
export type Equal<A, B> =
  // prettier-ignore
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2)
    ? true
    : false

describe('addQueryToInput', () => {
  it('should add the query object to a string input', () => {
    assertEquals(
      subject.addQueryToInput('https://example.com/api', { id: '1' }),
      'https://example.com/api?id=1',
    )
    assertEquals(
      subject.addQueryToInput('https://example.com/api', 'page=2&foo=bar'),
      'https://example.com/api?page=2&foo=bar',
    )
  })

  it('should add the query object to a URL input', () => {
    assertEquals(
      subject.addQueryToInput(new URL('https://example.com/api'), {
        id: '1',
      }),
      new URL('https://example.com/api?id=1'),
    )
    assertEquals(
      subject.addQueryToInput(new URL('https://example.com/api'), 'page=2'),
      new URL('https://example.com/api?page=2'),
    )
  })

  it('should append the query to a URL string that already has QS', () => {
    assertEquals(
      subject.addQueryToInput('https://example.com/api?id=1', { page: '2' }),
      'https://example.com/api?id=1&page=2',
    )
    assertEquals(
      subject.addQueryToInput('https://example.com/api?id=1', 'page=2'),
      'https://example.com/api?id=1&page=2',
    )
  })

  it("should return the input in case there's no query", () => {
    assertEquals(
      subject.addQueryToInput('https://example.com/api'),
      'https://example.com/api',
    )
    assertEquals(
      subject.addQueryToInput(new URL('https://example.com/api')),
      new URL('https://example.com/api'),
    )
  })
})

describe('makeGetApiUrl', () => {
  it('should return a URL which is baseURL and path joined', () => {
    assertEquals(
      subject.makeGetApiUrl('https://example.com/api')('/users'),
      'https://example.com/api/users',
    )
  })

  it('should accept an object-like queryString and return it joined to the URL', () => {
    const getApiURL = subject.makeGetApiUrl('https://example.com/api')
    assertEquals(
      getApiURL('/users', { id: '1' }),
      'https://example.com/api/users?id=1',
    )
    assertEquals(
      getApiURL('/users', { active: 'true', page: '2' }),
      'https://example.com/api/users?active=true&page=2',
    )
  })
})

describe('typedResponse', () => {
  it('should return unknown by default when turning into a JSON', async () => {
    const result = await subject.typedResponse(new Response('1')).json()
    type _R = Expect<Equal<typeof result, unknown>>
    assertEquals(result, 1)
  })

  it('should accept a type for the JSON method', async () => {
    const result = await subject
      .typedResponse(new Response(`{"foo":"bar"}`))
      .json<{ foo: string }>()
    type _R = Expect<Equal<typeof result, { foo: string }>>
    assertEquals(result, { foo: 'bar' })
  })

  it('should accept a parser for the JSON method', async () => {
    const result = await subject
      .typedResponse(new Response(`{"foo":"bar"}`))
      .json(z.object({ foo: z.string() }))
    type _R = Expect<Equal<typeof result, { foo: string }>>
    assertEquals(result, { foo: 'bar' })
  })
})

describe('ensureStringBody', () => {
  it('should return the same if body was string', () => {
    assertEquals(subject.ensureStringBody('foo'), 'foo')
  })

  it('should return the same if body was not defined', () => {
    assertEquals(subject.ensureStringBody(), undefined)
  })

  it('should stringify the body if it is a JSON-like value', () => {
    assertEquals(subject.ensureStringBody({ page: 2 }), `{"page":2}`)
  })
})

function successfulFetch(response: string | Record<string, unknown>) {
  return () =>
    Promise.resolve(
      new Response(
        typeof response === 'string' ? response : JSON.stringify(response),
      ),
    )
}

describe('enhancedFetch', () => {
  describe('proxied json', () => {
    it('should be untyped by default', async () => {
      const fetchStub = stub(window, 'fetch', successfulFetch({ foo: 'bar' }))
      const result = await subject
        .enhancedFetch('https://example.com/api/users')
        .then((r) => r.json())
      type _R = Expect<Equal<typeof result, unknown>>
      assertEquals(result, { foo: 'bar' })
      fetchStub.restore()
    })

    it('should accept a type', async () => {
      const fetchStub = stub(window, 'fetch', successfulFetch({ foo: 'bar' }))
      const result = await subject
        .enhancedFetch('https://example.com/api/users')
        .then((r) => r.json<{ foo: string }>())
      type _R = Expect<Equal<typeof result, { foo: string }>>
      assertEquals(result, { foo: 'bar' })
      fetchStub.restore()
    })

    it('should accept a parser', async () => {
      const fetchStub = stub(window, 'fetch', successfulFetch({ foo: 'bar' }))
      const result = await subject
        .enhancedFetch('https://example.com/api/users')
        .then((r) => r.json(z.object({ foo: z.string() })))
      type _R = Expect<Equal<typeof result, { foo: string }>>
      assertEquals(result, { foo: 'bar' })
      fetchStub.restore()
    })
  })

  describe('proxied text', () => {
    it('should be untyped by default', async () => {
      const fetchStub = stub(window, 'fetch', successfulFetch({ foo: 'bar' }))
      const result = await subject
        .enhancedFetch('https://example.com/api/users')
        .then((r) => r.text())
      type _R = Expect<Equal<typeof result, string>>
      assertEquals(result, `{"foo":"bar"}`)
      fetchStub.restore()
    })

    it('should accept a type', async () => {
      const fetchStub = stub(window, 'fetch', successfulFetch('john@doe.com'))
      const result = await subject
        .enhancedFetch('https://example.com/api/users')
        .then((r) => r.text<`${string}@${string}.${string}`>())
      type _R = Expect<Equal<typeof result, `${string}@${string}.${string}`>>
      assertEquals(result, 'john@doe.com')
      fetchStub.restore()
    })

    it('should accept a parser', async () => {
      const fetchStub = stub(window, 'fetch', successfulFetch('john@doe.com'))
      const result = await subject
        .enhancedFetch('https://example.com/api/users')
        .then((r) => r.text(z.string().email()))
      type _R = Expect<Equal<typeof result, string>>
      assertEquals(result, 'john@doe.com')
      fetchStub.restore()
    })
  })

  it('should accept a requestInit and a query', async () => {
    const fetchStub = stub(window, 'fetch', successfulFetch({ foo: 'bar' }))
    await subject.enhancedFetch('https://example.com/api/users', {
      headers: { Authorization: 'Bearer 123' },
      query: { admin: 'true' },
    })
    const req = fetchStub.calls[0].args[0] as Request
    assertEquals(req.url, 'https://example.com/api/users?admin=true')
    assertEquals(Object.fromEntries(req.headers), {
      authorization: 'Bearer 123',
      'content-type': 'application/json',
    })
    assertEquals(req.method, 'GET')
    assertEquals(await req.text(), '')
    fetchStub.restore()
  })

  it('should accept a stringified body', async () => {
    const fetchStub = stub(window, 'fetch', successfulFetch({ foo: 'bar' }))
    await subject.enhancedFetch('https://example.com/api/users', {
      body: JSON.stringify({ id: 1, name: { first: 'John', last: 'Doe' } }),
      method: 'POST',
    })
    const req = fetchStub.calls[0].args[0] as Request
    assertEquals(req.url, 'https://example.com/api/users')
    assertEquals(Object.fromEntries(req.headers), {
      'content-type': 'application/json',
    })
    assertEquals(req.method, 'POST')
    assertEquals(
      await req.text(),
      `{"id":1,"name":{"first":"John","last":"Doe"}}`,
    )
    fetchStub.restore()
  })

  it('should stringify the body', async () => {
    const fetchStub = stub(window, 'fetch', successfulFetch({ foo: 'bar' }))
    await subject.enhancedFetch('https://example.com/api/users', {
      body: { id: 1, name: { first: 'John', last: 'Doe' } },
      method: 'POST',
    })
    const req = fetchStub.calls[0].args[0] as Request
    assertEquals(req.url, 'https://example.com/api/users')
    assertEquals(Object.fromEntries(req.headers), {
      'content-type': 'application/json',
    })
    assertEquals(req.method, 'POST')
    assertEquals(
      await req.text(),
      `{"id":1,"name":{"first":"John","last":"Doe"}}`,
    )
    fetchStub.restore()
  })

  it('should accept a trace function for debugging purposes', async () => {
    const trace = spy()
    const fetchStub = stub(window, 'fetch', successfulFetch({ foo: 'bar' }))
    await subject.enhancedFetch('https://example.com/api/users', {
      body: { id: 1, name: { first: 'John', last: 'Doe' } },
      query: { admin: 'true' },
      trace,
      method: 'POST',
    })
    assertSpyCall(trace, 0, {
      args: [
        'https://example.com/api/users?admin=true',
        {
          headers: { 'content-type': 'application/json' },
          method: 'POST',
          body: `{"id":1,"name":{"first":"John","last":"Doe"}}`,
        },
      ],
    })
    fetchStub.restore()
  })
})

describe('makeApi', () => {
  it('should return an object with http methods', () => {
    const api = subject.makeApi('https://example.com/api')
    for (const method of HTTP_METHODS) {
      assertEquals(typeof api[method], 'function')
    }
  })

  it('should return an API with enhancedFetch', async () => {
    const fetchStub = stub(window, 'fetch', successfulFetch({ foo: 'bar' }))
    const api = subject.makeApi('https://example.com/api')
    const result = await api
      .post('/users')
      .then((r) => r.json(z.object({ foo: z.string() })))
    type _R = Expect<Equal<typeof result, { foo: string }>>
    assertEquals(result, { foo: 'bar' })
    const req = fetchStub.calls[0].args[0] as Request
    assertEquals(req.url, 'https://example.com/api/users')
    assertEquals(Object.fromEntries(req.headers), {
      'content-type': 'application/json',
    })
    assertEquals(req.method, 'POST')
    assertEquals(await req.text(), '')
    fetchStub.restore()
  })

  it('should add headers and method to the request', async () => {
    const fetchStub = stub(window, 'fetch', successfulFetch({ foo: 'bar' }))
    const api = subject.makeApi('https://example.com/api', {
      Authorization: 'Bearer 123',
    })
    await api.get('/users')
    const req = fetchStub.calls[0].args[0] as Request
    assertEquals(req.url, 'https://example.com/api/users')
    assertEquals(Object.fromEntries(req.headers), {
      authorization: 'Bearer 123',
      'content-type': 'application/json',
    })
    assertEquals(req.method, 'GET')
    assertEquals(await req.text(), '')
    fetchStub.restore()
  })

  it('should accept a query, trace, and JSON-like body', async () => {
    const trace = spy()
    const fetchStub = stub(window, 'fetch', successfulFetch({ foo: 'bar' }))
    const api = subject.makeApi('https://example.com/api')
    await api.post('/users', {
      body: { id: 1, name: { first: 'John', last: 'Doe' } },
      query: { admin: 'true' },
      trace,
    })
    assertSpyCall(trace, 0, {
      args: [
        'https://example.com/api/users?admin=true',
        {
          headers: { 'content-type': 'application/json' },
          method: 'post',
          body: `{"id":1,"name":{"first":"John","last":"Doe"}}`,
        },
      ],
    })
    fetchStub.restore()
  })
})
