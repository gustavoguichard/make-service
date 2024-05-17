import { HTTP_METHODS } from './constants'
import { getJson, getText } from './internals'
import {
  addQueryToURL,
  ensureStringBody,
  makeGetApiURL,
  mergeHeaders,
  replaceURLParams,
} from './primitives'
import type {
  BaseOptions,
  EnhancedRequestInit,
  GetJson,
  GetText,
  HTTPMethod,
  ServiceRequestInit,
  TypedResponse,
  TypedResponseJson,
  TypedResponseText,
} from './types'

const identity = <T>(value: T) => value

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
function typedResponse(
  response: Response,
  options?: { getJson?: GetJson; getText?: GetText },
): TypedResponse {
  const getJsonFn = options?.getJson ?? getJson
  const getTextFn = options?.getText ?? getText

  return new Proxy(response, {
    get(target, prop) {
      if (prop === 'json') return getJsonFn(target)
      if (prop === 'text') return getTextFn(target)

      const value = Reflect.get(target, prop)

      if (typeof value === 'function') {
        return value.bind(target)
      }

      return value
    },
  }) as Omit<Response, 'json' | 'text'> & {
    json: TypedResponseJson
    text: TypedResponseText
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
  const body = ensureStringBody(reqInit.body)
  const withParams = replaceURLParams<T>(url, reqInit.params ?? ({} as never))
  const fullURL = addQueryToURL(withParams, query)

  const enhancedReqInit = { ...reqInit, body }
  trace?.(fullURL, enhancedReqInit)
  const response = await fetch(fullURL, enhancedReqInit)

  return typedResponse(response)
}

/**
 *
 * @param baseURL the base URL to be fetched in every request
 * @param baseOptions options that will be applied to all requests
 * @param baseOptions.headers any headers that should be sent with every request
 * @param baseOptions.requestTransformer a function that will transform the enhanced request init of every request
 * @param baseOptions.responseTransformer a function that will transform the typed response of every request
 * @param baseOptions.timeout the maximum number of milliseconds any request is allowed before the promise is rejected.
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
    const { headers, timeout } = baseOptions
    const requestTransformer = baseOptions.requestTransformer ?? identity
    const responseTransformer = baseOptions.responseTransformer ?? identity
    const headerTransformer = async (ri: EnhancedRequestInit) => ({
      ...ri,
      headers: mergeHeaders(
        typeof headers === 'function' ? await headers() : headers ?? {},
        ri.headers ?? {},
        requestInit?.headers ?? {},
      ),
    })

    const url = makeGetApiURL(baseURL)(path)
    const fetchPromise = async () =>
      enhancedFetch(
        url,
        await headerTransformer(await requestTransformer(requestInit)),
      )

    const throwOnTimeout = (timeout: number) =>
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error(`Timed out (${timeout}ms) fetching ${url}`)),
          timeout,
        ),
      )

    const response = (await (timeout == undefined
      ? fetchPromise()
      : Promise.race([fetchPromise(), throwOnTimeout(timeout)]))) as Awaited<
      ReturnType<typeof fetchPromise>
    >
    return responseTransformer(response)
  }
}

/**
 *
 * @param baseURL the base URL to the API
 * @param baseOptions options that will be applied to all requests
 * @param baseOptions.headers any headers that should be sent with every request
 * @param baseOptions.requestTransformer a function that will transform the enhanced request init of every request
 * @param baseOptions.responseTransformer a function that will transform the typed response of every request
 * @param baseOptions.timeout the maximum number of milliseconds any request is allowed before the promise is rejected.
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

  const service = {} as Record<
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
