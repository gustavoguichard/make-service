import { HTTP_METHODS } from './constants'
import { getJson, getText } from './internals'
import {
  addQueryToURL,
  ensureStringBody,
  makeGetApiURL,
  mergeHeaders,
  replaceURLParams,
} from './primitives'
import {
  BaseOptions,
  EnhancedRequestInit,
  HTTPMethod,
  ServiceRequestInit,
  TypedResponse,
} from './types'

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
async function enhancedFetch<T extends string | URL>(
  url: T,
  requestInit?: EnhancedRequestInit<T>,
) {
  const { query, trace, ...reqInit } = requestInit ?? {}
  const headers = mergeHeaders(
    {
      'content-type': 'application/json',
    },
    reqInit.headers ?? {},
  )
  const withParams = replaceURLParams<T>(url, reqInit.params ?? ({} as never))
  const fullURL = addQueryToURL(withParams, query)
  const body = ensureStringBody(reqInit.body)

  const enhancedReqInit = { ...reqInit, headers, body }
  trace?.(fullURL, enhancedReqInit)
  const response = await fetch(fullURL, enhancedReqInit)

  return typedResponse(response)
}

/**
 *
 * @param baseURL the base URL to be fetched in every request
 * @param baseHeaders any headers that should be sent with every request
 * @returns a function that receive a path and requestInit and return a serialized json response that can be typed or not.
 * @example const headers = { Authorization: "Bearer 123" }
 * const fetcher = makeFetcher("https://example.com/api", headers);
 * const response = await fetcher("/users", { method: "GET" })
 * const users = await response.json(userSchema);
 * //    ^? User[]
 */
function makeFetcher(baseURL: string | URL, baseOptions: BaseOptions = {}) {
  return async <T extends string>(
    path: T,
    requestInit: EnhancedRequestInit<T> = {},
  ) => {
    const { headers } = baseOptions
    const requestTransformer =
      baseOptions.requestTransformer ?? ((requestInit) => requestInit)
    const url = makeGetApiURL(baseURL)(path)
    const response = await enhancedFetch(url, {
      ...requestTransformer(requestInit),
      headers: mergeHeaders(
        typeof headers === 'function' ? await headers() : headers ?? {},
        requestInit?.headers ?? {},
      ),
    })
    return response
  }
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
function makeService(baseURL: string | URL, baseOptions?: BaseOptions) {
  const fetcher = makeFetcher(baseURL, baseOptions)

  function appliedService(method: HTTPMethod) {
    return async <T extends string>(
      path: T,
      requestInit: ServiceRequestInit<T> = {},
    ) => fetcher(path, { ...requestInit, method })
  }

  let service = {} as Record<
    Lowercase<HTTPMethod>,
    ReturnType<typeof appliedService>
  >
  for (const method of HTTP_METHODS) {
    const lowerMethod = method.toLowerCase() as Lowercase<HTTPMethod>
    service[lowerMethod] = appliedService(method)
  }
  return service
}

export { enhancedFetch, makeFetcher, makeService, typedResponse }
