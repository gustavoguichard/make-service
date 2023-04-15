import { HTTP_METHODS } from './constants'
import {
  getJson,
  getText,
  isHTTPMethod,
  replaceUrlParams,
  typeOf,
} from './internals'
import {
  EnhancedRequestInit,
  HTTPMethod,
  JSONValue,
  Route,
  SearchParams,
  ServiceRequestInit,
  StrictReqInit,
  TypedResponse,
} from './types'

/**
 * It merges multiple HeadersInit objects into a single Headers object
 * @param entries Any number of HeadersInit objects
 * @returns a new Headers object with the merged headers
 */
function mergeHeaders(
  ...entries: (
    | HeadersInit
    | [string, undefined][]
    | Record<string, undefined>
  )[]
) {
  const result = new Map<string, string>()

  for (const entry of entries) {
    const headers = new Headers(entry as HeadersInit)

    for (const [key, value] of headers.entries()) {
      if (value === undefined || value === 'undefined') {
        result.delete(key)
      } else {
        result.set(key, value)
      }
    }
  }

  return new Headers(Array.from(result.entries()))
}

/**
 * @param url a string or URL to which the query parameters will be added
 * @param searchParams the query parameters
 * @returns the url with the query parameters added with the same type as the url
 */
function addQueryToUrl(
  url: string | URL,
  searchParams?: SearchParams,
): string | URL {
  if (!searchParams) return url

  if (typeof url === 'string') {
    const separator = url.includes('?') ? '&' : '?'
    return `${url}${separator}${new URLSearchParams(searchParams)}`
  }
  if (searchParams && url instanceof URL) {
    for (const [key, value] of Object.entries(
      new URLSearchParams(searchParams),
    )) {
      url.searchParams.set(key, value)
    }
  }
  return url
}

/**
 * @param baseURL the base path to the API
 * @returns a function that receives a path and an object of query parameters and returns a URL
 */
function makeGetApiUrl(baseURL: string | URL) {
  const base = baseURL instanceof URL ? baseURL.toString() : baseURL
  return (path: string, searchParams?: SearchParams): string | URL => {
    const url = `${base}${path}`.replace(/([^https?:]\/)\/+/g, '$1')
    return addQueryToUrl(url, searchParams)
  }
}

/**
 * It hacks the Response object to add typed json and text methods
 * @param response the Response to be proxied
 * @returns a Response with typed json and text methods
 * @example const response = await fetch("https://example.com/api/users");
 * const users = await response.json(userSchema);
 * //    ^? User[]
 * const untyped = await response.json();
 * //    ^? unknown
 * const text = await response.text();
 * //    ^? string
 * const typedJson = await response.json<User[]>();
 * //    ^? User[]
 */
function typedResponse(response: Response): TypedResponse {
  return new Proxy(response, {
    get(target, prop) {
      if (prop === 'json') return getJson(target)
      if (prop === 'text') return getText(target)
      return target[prop as keyof Response]
    },
  }) as Omit<Response, 'json' | 'text'> & {
    json: ReturnType<typeof getJson>
    text: ReturnType<typeof getText>
  }
}

/**
 * @param body the JSON-like body of the request
 * @returns the body is stringified if it is not a string and it is a JSON-like object. It also accepts other types of BodyInit such as Blob, ReadableStream, etc.
 */
function ensureStringBody<B extends JSONValue | BodyInit | null>(
  body?: B,
): B extends JSONValue ? string : B {
  if (typeof body === 'undefined') return body as never
  if (typeof body === 'string') return body as never

  return (
    ['number', 'boolean', 'array', 'object'].includes(typeOf(body))
      ? JSON.stringify(body)
      : body
  ) as never
}

/**
 *
 * @param url a string or URL to be fetched
 * @param requestInit the requestInit to be passed to the fetch request. It is the same as the `RequestInit` type, but it also accepts a JSON-like `body` and an object-like `query` parameter.
 * @param requestInit.body the body of the request. It will be automatically stringified so you can send a JSON-like object
 * @param requestInit.query the query parameters to be added to the URL
 * @param requestInit.trace a function that receives the URL and the requestInit and can be used to log the request
 * @returns a Response with typed json and text methods
 * @example const response = await fetch("https://example.com/api/users");
 * const users = await response.json(userSchema);
 * //    ^? User[]
 * const untyped = await response.json();
 * //    ^? unknown
 */
async function enhancedFetch(
  url: string | URL,
  requestInit?: EnhancedRequestInit,
) {
  const { query, trace, ...reqInit } = requestInit ?? {}
  const headers = mergeHeaders(
    {
      'content-type': 'application/json',
    },
    reqInit.headers ?? {},
  )
  const withParams = replaceUrlParams(url, reqInit.params ?? {})
  const fullUrl = addQueryToUrl(withParams, query)
  const body = ensureStringBody(reqInit.body)

  const enhancedReqInit = { ...reqInit, headers, body }
  trace?.(fullUrl, enhancedReqInit)
  const response = await fetch(fullUrl, enhancedReqInit)

  return typedResponse(response)
}

/**
 *
 * @param baseURL the base URL to the API
 * @param baseHeaders any headers that should be sent with every request
 * @returns a service object with HTTP methods that are functions that receive a path and requestInit and return a serialized json response that can be typed or not.
 * @example const headers = { Authorization: "Bearer 123" }
 * const api = makeService("https://example.com/api", headers);
 * const response = await api.get("/users")
 * const users = await response.json(userSchema);
 * //    ^? User[]
 */
function makeService<const T extends Route>(
  baseURL: string | URL,
  baseHeaders?: HeadersInit | (() => HeadersInit | Promise<HeadersInit>),
  routes?: T[],
) {
  /**
   * A function that receives a path and requestInit and returns a serialized json response that can be typed or not.
   * @param method the HTTP method
   * @returns the service function for the given HTTP method
   */
  const service = (method: HTTPMethod) => {
    return async (path: string, requestInit: ServiceRequestInit = {}) => {
      const url = makeGetApiUrl(baseURL)(path)
      const response = await enhancedFetch(url, {
        ...requestInit,
        method,
        headers: mergeHeaders(
          typeof baseHeaders === 'function'
            ? await baseHeaders()
            : baseHeaders ?? {},
          requestInit?.headers ?? {},
        ),
      })
      return response
    }
  }

  const methodsSet = routes
    ? Array.from(new Set(routes.map((route) => route.method)))
    : HTTP_METHODS

  /**
   * It returns a proxy that returns the service function for each HTTP method
   */
  return new Proxy(
    {} as typeof routes extends undefined
      ? { [K in Lowercase<HTTPMethod>]: ReturnType<typeof service> }
      : {
          [K in T['method'] as Lowercase<T['method']>]: <
            R extends Extract<T, { method: K }>,
            P extends R['path'],
          >(
            path: P,
            requestInit?: StrictReqInit<Extract<R, { method: K; path: P }>>,
          ) => Promise<TypedResponse>
        },
    {
      get(_target, prop) {
        const method = String(prop).toUpperCase() as HTTPMethod
        if (isHTTPMethod(method) && methodsSet.includes(method)) {
          return service(method)
        }

        throw new Error(`Invalid HTTP method: ${prop.toString()}`)
      },
    },
  )
}

export {
  addQueryToUrl,
  ensureStringBody,
  enhancedFetch,
  makeService,
  makeGetApiUrl,
  mergeHeaders,
  typedResponse,
}
