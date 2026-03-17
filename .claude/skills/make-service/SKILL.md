---
name: make-service
description: Use the make-service library to create type-safe HTTP service clients wrapping the fetch API. Use when creating API services, making HTTP requests, configuring fetch wrappers, working with typed responses, or when code imports from "make-service". Covers makeService, makeFetcher, enhancedFetch, typedResponse, and all utilities.
---

# make-service

A type-safe fetch wrapper for building HTTP service clients. Zero dependencies, built on the Standard Schema spec for runtime validation with Zod, Arktype, or any compatible library.

## Core API

### `makeService(baseURL, options?)`

Creates an object with HTTP methods bound to a base URL.

```ts
import { makeService } from 'make-service'

const api = makeService('https://api.example.com/v1', {
  headers: { 'content-type': 'application/json' },
})

const response = await api.get('/users')
const response = await api.post('/users', { body: { name: 'John' } })
const response = await api.put('/users/:id', { params: { id: '1' }, body: { name: 'Jane' } })
const response = await api.delete('/users/:id', { params: { id: '1' } })
const response = await api.patch('/users/:id', { params: { id: '1' }, body: { active: false } })
```

Available methods: `get`, `post`, `put`, `delete`, `patch`, `head`, `options`, `connect`.

### `makeFetcher(baseURL, options?)`

Like `makeService` but returns a single function that accepts `method` in requestInit.

```ts
const fetcher = makeFetcher('https://api.example.com')
const response = await fetcher('/users', { method: 'POST', body: { name: 'John' } })
```

### `enhancedFetch(url, requestInit?)`

Enhanced fetch without base URL binding. Same typed response behavior.

```ts
const response = await enhancedFetch('https://api.example.com/users')
```

### `typedResponse(response)`

Wraps a native `Response` to add typed `json()` and `text()` methods.

```ts
const typed = typedResponse(nativeResponse)
const data = await typed.json() // unknown (not any!)
```

## BaseOptions

```ts
type BaseOptions = {
  headers?: HeadersInit | (() => HeadersInit | Promise<HeadersInit>)
  requestTransformer?: (request: EnhancedRequestInit) => EnhancedRequestInit | Promise<EnhancedRequestInit>
  responseTransformer?: (response: TypedResponse) => TypedResponse | Promise<TypedResponse>
}
```

### Dynamic headers

Pass a function (sync or async) to compute headers per request:

```ts
const api = makeService('https://api.example.com', {
  headers: async () => ({
    authorization: `Bearer ${await getToken()}`,
  }),
})
```

### Request transformer

Runs before headers are merged. Transform the body, add signals, etc:

```ts
import { deepSnakeKeys } from 'string-ts'

const api = makeService('https://api.example.com', {
  requestTransformer: (request) => ({
    ...request,
    body: deepSnakeKeys(request.body),
  }),
})
```

### Response transformer

Transform responses after fetch completes:

```ts
import { camelKeys } from 'string-ts'

const api = makeService('https://api.example.com', {
  responseTransformer: (response) => {
    const headers = camelKeys(Object.fromEntries(response.headers))
    // extract tokens, update sessions, etc.
    return response
  },
})
```

## Request Options (ServiceRequestInit)

### Path params

URL segments with `:param` syntax are type-checked:

```ts
await api.get('/users/:id/posts/:postId', {
  params: { id: '1', postId: '42' },
})
// Resolves to: /users/1/posts/42
```

### Query params

```ts
await api.get('/users', { query: { page: '2', limit: '10' } })
// Resolves to: /users?page=2&limit=10
```

Accepts `Record<string, string>`, `URLSearchParams`, string, or entries array. Merges with existing query strings in the path.

### Body

JSON-like objects are auto-stringified. `FormData`, `Blob`, `ReadableStream` pass through unchanged:

```ts
await api.post('/users', { body: { name: 'John', age: 30 } })
await api.post('/upload', { body: formData })
```

### Trace

Debug hook called after fetch completes:

```ts
await api.get('/users', {
  trace: (url, init, response) => {
    console.log(`${init.method} ${url} → ${response.status}`)
  },
})
```

### Headers per request

Request-level headers merge with (and override) base headers. Set a value to `undefined` or `'undefined'` to remove a base header:

```ts
await api.get('/public', { headers: { authorization: undefined } })
```

## Typed Responses

All methods return `TypedResponse` — a `Response` with enhanced `json()` and `text()`:

### Generic type cast (no validation)

```ts
const users = await response.json<User[]>()
```

### Schema validation (runtime safe)

Pass any Standard Schema-compatible schema (Zod, Arktype, etc.):

```ts
import { z } from 'zod'

const users = await response.json(
  z.array(z.object({ id: z.number(), name: z.string() }))
)
```

On validation failure, throws `ParseResponseError` with `.issues` array.

### Schema with transform

```ts
import { deepCamelKeys } from 'string-ts'

const data = await response.json(
  z.object({
    first_name: z.string(),
    last_name: z.string(),
  }).transform(deepCamelKeys)
)
// data is { firstName: string, lastName: string }
```

### Text with types

```ts
const email = await response.text<`${string}@${string}`>()
const validated = await response.text(z.string().email())
```

## Utility Functions

### `mergeHeaders(...entries)`

Merge multiple `HeadersInit` into one `Headers` object:

```ts
const headers = mergeHeaders(
  { 'content-type': 'application/json' },
  new Headers({ authorization: 'Bearer token' }),
)
```

### `addQueryToURL(url, params)`

```ts
addQueryToURL('/users', { page: '1' }) // '/users?page=1'
addQueryToURL('/users?admin=true', { page: '1' }) // '/users?admin=true&page=1'
```

### `replaceURLParams(url, params)`

```ts
replaceURLParams('/users/:id', { id: '42' }) // '/users/42'
```

### `makeGetApiURL(baseURL)`

Factory for building full URLs:

```ts
const getApiURL = makeGetApiURL('https://api.example.com')
getApiURL('/users', { page: '1' }) // 'https://api.example.com/users?page=1'
```

### `ensureStringBody(body)`

Stringifies JSON-like objects, passes through `FormData`/`Blob`/etc. unchanged.

### `ParseResponseError`

Thrown on schema validation failure:

```ts
import { ParseResponseError } from 'make-service'

try {
  const data = await response.json(schema)
} catch (error) {
  if (error instanceof ParseResponseError) {
    console.log(error.issues) // [{ message: '...', path: [...] }]
  }
}
```

## Patterns and Real-World Usage

For detailed patterns combining make-service with string-ts, composable-functions, and authentication flows, see [references/patterns.md](references/patterns.md).
