import { getJson, getText, isHTTPMethod } from './internals'
import type {
  EnhancedRequestInit,
  HTTPMethod,
  JSONValue,
  SearchParams,
  ServiceRequestInit,
  TypedResponse,
} from './types'

/**
 * @param input a string or URL to which the query parameters will be added
 * @param searchParams the query parameters
 * @returns the input with the query parameters added with the same type as the input
 */
function addQueryToInput(
  input: string | URL,
  searchParams?: SearchParams,
): string | URL {
  if (!searchParams) return input

  if (searchParams && typeof input === 'string') {
    const separator = input.includes('?') ? '&' : '?'
    return `${input}${separator}${new URLSearchParams(searchParams)}`
  }
  if (searchParams && input instanceof URL) {
    input.search = new URLSearchParams(searchParams).toString()
  }
  return input
}

/**
 * @param baseURL the base path to the API
 * @returns a function that receives a path and an object of query parameters and returns a URL
 */
function makeGetApiUrl(baseURL: string) {
  return (path: string, searchParams?: SearchParams): string | URL =>
    addQueryToInput(`${baseURL}${path}`, searchParams)
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
 * @returns the body stringified if it is not a string
 */
function ensureStringBody(body?: JSONValue): string | undefined {
  if (typeof body === 'undefined') return
  if (typeof body === 'string') return body
  return JSON.stringify(body)
}

/**
 *
 * @param input a string or URL to be fetched
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
  input: string | URL,
  requestInit?: EnhancedRequestInit,
) {
  const { query, trace, ...reqInit } = requestInit ?? {}
  const headers = { 'content-type': 'application/json', ...reqInit.headers }
  const url = addQueryToInput(input, query)
  const body = ensureStringBody(reqInit.body)

  const enhancedReqInit = { ...reqInit, headers, body }
  trace?.(url, enhancedReqInit)
  const request = new Request(url, enhancedReqInit)
  const response = await fetch(request)

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
function makeService(baseURL: string, baseHeaders?: HeadersInit) {
  /**
   * A function that receives a path and requestInit and returns a serialized json response that can be typed or not.
   * @param method the HTTP method
   * @returns the service function for the given HTTP method
   */
  const service = (method: HTTPMethod) => {
    return async (path: string, requestInit: ServiceRequestInit = {}) => {
      const response = await enhancedFetch(`${baseURL}${path}`, {
        ...requestInit,
        method,
        headers: { ...baseHeaders, ...requestInit?.headers },
      })
      return response
    }
  }

  /**
   * It returns a proxy that returns the service function for each HTTP method
   */
  return new Proxy({} as { [K in HTTPMethod]: ReturnType<typeof service> }, {
    get(_target, prop) {
      if (isHTTPMethod(prop)) return service(prop)
      throw new Error(`Invalid HTTP method: ${prop.toString()}`)
    },
  })
}

export {
  addQueryToInput,
  ensureStringBody,
  enhancedFetch,
  makeService,
  makeGetApiUrl,
  typedResponse,
}
