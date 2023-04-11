import { getJson, getText, isHTTPMethod } from './internals.ts'
import { HTTPMethod, JSONValue, SearchParams } from './types.ts'

/**
 * @param input a string or URL to which the query parameters will be added
 * @param searchParams the query parameters
 * @returns the input with the query parameters added with the same type as the input
 */
function addQueryToInput(input: string | URL, searchParams?: SearchParams) {
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
  return (path: string, searchParams?: SearchParams) =>
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
function typedResponse(response: Response) {
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
function ensureStringBody(body?: JSONValue) {
  if (typeof body === 'undefined') return
  if (typeof body === 'string') return body
  return JSON.stringify(body)
}

type Options = Omit<RequestInit, 'body'> & {
  body?: JSONValue
  query?: SearchParams
  trace?: (...args: Parameters<typeof fetch>) => void
}
/**
 *
 * @param input a string or URL to be fetched
 * @param options the options to be passed to the fetch request. It is the same as the `RequestInit` type, but it also accepts a JSON-like `body` and an object-like `query` parameter.
 * @param options.body the body of the request. It will be automatically stringified so you can send a JSON-like object
 * @param options.query the query parameters to be added to the URL
 * @param options.trace a function that receives the URL and the requestInit and can be used to log the request
 * @returns a Response with typed json and text methods
 * @example const response = await fetch("https://example.com/api/users");
 * const users = await response.json(userSchema);
 * //    ^? User[]
 * const untyped = await response.json();
 * //    ^? unknown
 */
async function enhancedFetch(input: string | URL, options?: Options) {
  const { query, trace, ...reqInit } = options ?? {}
  const headers = { 'content-type': 'application/json', ...reqInit.headers }
  const url = addQueryToInput(input, query)
  const body = ensureStringBody(reqInit.body)

  const requestInit = { ...reqInit, headers, body }
  trace?.(url, requestInit)
  const request = new Request(url, requestInit)
  const response = await fetch(request)

  return typedResponse(response)
}

/**
 *
 * @param baseURL the base URL to the API
 * @param baseHeaders any headers that should be sent with every request
 * @returns an API object with HTTP methods that are functions that receive a path and options and return a serialized json response that can be typed or not.
 * @example const headers = { Authorization: "Bearer 123" }
 * const api = makeService("https://example.com/api", headers);
 * const response = await api.get("/users")
 * const users = await response.json(userSchema);
 * //    ^? User[]
 */
function makeService(baseURL: string, baseHeaders?: HeadersInit) {
  /**
   * A function that receives a path and options and returns a serialized json response that can be typed or not.
   * @param method the HTTP method
   * @returns the API function for the given HTTP method
   */
  const api = (method: HTTPMethod) => {
    return async (path: string, options: Omit<Options, 'method'> = {}) => {
      const response = await enhancedFetch(`${baseURL}${path}`, {
        ...options,
        method,
        headers: { ...baseHeaders, ...options?.headers },
      })
      return response
    }
  }

  /**
   * It returns a proxy that returns the api function for each HTTP method
   */
  return new Proxy({} as Record<HTTPMethod, ReturnType<typeof api>>, {
    get(_target, prop) {
      if (isHTTPMethod(prop)) return api(prop)
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
