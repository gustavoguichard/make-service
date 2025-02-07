import * as subject from './primitives'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('addQueryToURL', () => {
  it('should add the query object to a string input', () => {
    expect(subject.addQueryToURL('https://example.com/api', { id: '1' })).toBe(
      'https://example.com/api?id=1',
    )
    expect(
      subject.addQueryToURL('https://example.com/api', 'page=2&foo=bar'),
    ).toBe('https://example.com/api?page=2&foo=bar')
  })

  it('should add the query object to a URL input', () => {
    expect(
      subject
        .addQueryToURL(new URL('https://example.com/api'), {
          id: '1',
        })
        .toString(),
    ).toEqual(new URL('https://example.com/api?id=1').toString())
    expect(
      subject
        .addQueryToURL(new URL('https://example.com/api'), 'page=2')
        .toString(),
    ).toEqual(new URL('https://example.com/api?page=2').toString())
  })

  it('should append the query to a URL string that already has QS', () => {
    expect(
      subject.addQueryToURL('https://example.com/api?id=1', { page: '2' }),
    ).toBe('https://example.com/api?id=1&page=2')
    expect(
      subject.addQueryToURL('https://example.com/api?id=1', 'page=2'),
    ).toBe('https://example.com/api?id=1&page=2')
    expect(
      subject.addQueryToURL(
        'https://example.com/api?id=1',
        new URLSearchParams({ page: '2' }),
      ),
    ).toBe('https://example.com/api?id=1&page=2')
  })

  it('should append the query to a URL instance that already has QS', () => {
    expect(
      subject
        .addQueryToURL(new URL('https://example.com/api?id=1'), {
          page: '2',
        })
        .toString(),
    ).toEqual(new URL('https://example.com/api?id=1&page=2').toString())
    expect(
      subject
        .addQueryToURL(new URL('https://example.com/api?id=1'), 'page=2')
        .toString(),
    ).toEqual(new URL('https://example.com/api?id=1&page=2').toString())
    expect(
      subject
        .addQueryToURL(
          new URL('https://example.com/api?id=1'),
          new URLSearchParams({ page: '2' }),
        )
        .toString(),
    ).toEqual(new URL('https://example.com/api?id=1&page=2').toString())
  })

  it("should return the input in case there's no query", () => {
    expect(subject.addQueryToURL('https://example.com/api')).toBe(
      'https://example.com/api',
    )
    expect(subject.addQueryToURL(new URL('https://example.com/api'))).toEqual(
      new URL('https://example.com/api'),
    )
  })
})

describe('ensureStringBody', () => {
  it('should return the same if body was string', () => {
    expect(subject.ensureStringBody('foo')).toBe('foo')
  })

  it('should return the same if body was not defined', () => {
    expect(subject.ensureStringBody()).toBeUndefined()
  })

  it('should stringify the body if it is a JSON-like value', () => {
    expect(subject.ensureStringBody({ page: 2 })).toBe(`{"page":2}`)
    expect(subject.ensureStringBody([1, 2])).toBe(`[1,2]`)
    expect(subject.ensureStringBody(3)).toBe(`3`)
    expect(subject.ensureStringBody(true)).toBe(`true`)
    expect(subject.ensureStringBody({})).toBe(`{}`)
  })

  it('should not stringify other valid kinds of BodyInit', () => {
    const ab = new ArrayBuffer(0)
    expect(subject.ensureStringBody(ab)).toBe(ab)
    const rs = new ReadableStream()
    expect(subject.ensureStringBody(rs)).toBe(rs)
    const fd = new FormData()
    expect(subject.ensureStringBody(fd)).toBe(fd)
    const usp = new URLSearchParams()
    expect(subject.ensureStringBody(usp)).toBe(usp)
    const blob = new Blob()
    expect(subject.ensureStringBody(blob)).toBe(blob)
  })
})

describe('makeGetApiURL', () => {
  it('should return a URL which is baseURL and path joined', () => {
    expect(subject.makeGetApiURL('https://example.com/api')('/users')).toBe(
      'https://example.com/api/users',
    )
  })

  it('should accept an object-like queryString and return it joined to the URL', () => {
    const getApiURL = subject.makeGetApiURL('https://example.com/api')
    expect(getApiURL('/users', { id: '1' })).toBe(
      'https://example.com/api/users?id=1',
    )
    expect(getApiURL('/users', { active: 'true', page: '2' })).toBe(
      'https://example.com/api/users?active=true&page=2',
    )
  })

  it('should accept a URL as baseURL and remove extra slashes', () => {
    expect(
      subject.makeGetApiURL(new URL('https://example.com/api'))('/users'),
    ).toBe('https://example.com/api/users')
    expect(
      subject.makeGetApiURL(new URL('https://example.com/api/'))('/users'),
    ).toBe('https://example.com/api/users')
    expect(
      subject.makeGetApiURL(new URL('https://example.com/api/'))('///users'),
    ).toBe('https://example.com/api/users')
  })

  it('should add missing slashes', () => {
    expect(
      subject.makeGetApiURL(new URL('https://example.com/api'))('users'),
    ).toBe('https://example.com/api/users')
  })
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

  it('should be case insensitive such as Headers', () => {
    expect(
      subject.mergeHeaders(new Headers({ 'Content-Type': 'text/html' }), {
        'content-type': 'application/json',
      }),
    ).toEqual(new Headers({ 'Content-Type': 'application/json' }))

    expect(
      subject.mergeHeaders(new Headers({ 'Content-Type': 'text/html' }), {
        'content-type': undefined,
      }),
    ).toEqual(new Headers({}))
  })
})

describe('replaceURLParams', () => {
  it('should replace the wildcards in an URL string with the given parameters', () => {
    expect(subject.replaceURLParams('/users/:id', { id: '1' })).toBe('/users/1')
    expect(
      subject.replaceURLParams('http://example.com/users/:id/posts/:postId', {
        id: '1',
        postId: '3',
      }),
    ).toBe('http://example.com/users/1/posts/3')
  })

  it('should replace the wildcards in an instance of URL', () => {
    expect(
      subject.replaceURLParams(new URL('/users/:id', 'http://example.com'), {
        id: '1',
      }),
    ).toEqual(new URL('http://example.com/users/1'))
  })

  it('should accept numbers as parameters', () => {
    expect(subject.replaceURLParams('/users/:id', { id: 1 })).toBe('/users/1')
  })
})

describe('typeOf', () => {
  it('should a string version of the type of an unknown value', () => {
    expect(subject.typeOf([])).toBe('array')
    expect(subject.typeOf(new ArrayBuffer(0))).toBe('arraybuffer')
    expect(subject.typeOf(BigInt(1))).toBe('bigint')
    expect(subject.typeOf(new Blob())).toBe('blob')
    expect(subject.typeOf(false)).toBe('boolean')
    expect(subject.typeOf(new FormData())).toBe('formdata')
    expect(subject.typeOf(() => {})).toBe('function')
    expect(subject.typeOf(null)).toBe('null')
    expect(subject.typeOf(1)).toBe('number')
    expect(subject.typeOf({})).toBe('object')
    expect(subject.typeOf(new ReadableStream())).toBe('readablestream')
    expect(subject.typeOf('')).toBe('string')
    expect(subject.typeOf(Symbol('a'))).toBe('symbol')
    expect(subject.typeOf(undefined)).toBe('undefined')
    expect(subject.typeOf(new URL('http://localhost'))).toBe('url')
    expect(subject.typeOf(new URLSearchParams())).toBe('urlsearchparams')
  })
})
