# make-service

A type-safe thin wrapper around the `fetch` API to better interact with external APIs.

It adds a set of little features and allows you to parse responses with [zod](https://github.com/colinhacks/zod).

## Features
- 🤩 Type-safe return of `response.json()` and `response.text()`. Defaults to `unknown` instead of `any`.
- 🚦 Easily setup an API with a `baseURL` and common `headers` for every request.
- 🏗️ Compose URL from the base by just calling the endpoints and an object-like `query`.
- 🐾 Replaces URL wildcards with an object of `params`.
- 🧙‍♀️ Automatically stringifies the `body` of a request so you can give it a JSON-like structure.
- 🐛 Accepts a `trace` function for debugging.

## Example

```ts
const service = makeService("https://example.com/api", {
  Authorization: "Bearer 123",
});

const response = await service.get("/users")
const users = await response.json(usersSchema);
//    ^? User[]
```

# Table of Contents
- [Installation](#installation)
- [API](#api)
  - [makeService](#makeservice)
    - [Usage](#usage)
    - [Type-checking the response body](#type-checking-the-response-body)
    - [Runtime type-checking and parsing the response body](#runtime-type-checking-and-parsing-the-response-body)
    - [Supported HTTP Verbs](#supported-http-verbs)
    - [Headers](#headers)
      - [Passing a function as `baseHeaders`](#passing-a-function-as-baseheaders)
      - [Deleting a previously set header](#deleting-a-previously-set-header)
    - [Base URL](#base-url)
    - [Body](#body)
    - [Query](#query)
    - [Params](#params)
    - [Trace](#trace)
  - [enhancedFetch](#enhancedfetch)
  - [typedResponse](#typedresponse)
  - [Thank you](#thank-you)

# Installation

```sh
npm install make-service
```
Or you can use it with Deno:

```ts
import { makeService } from "https://deno.land/x/make_service/mod.ts";
```

# API

This library exports the `makeService` function and some primitives used to build it. You can use the primitives as you wish but the `makeService` will have all the features combined.

## makeService

### Usage
The main function of this lib is built on top of the primitives described in the following sections. It allows you to create a service object with a `baseURL` and common `headers` for every request.

This service object can be called with every HTTP method and it will return a [`typedResponse`](#typedresponse) object as it uses the [`enhancedFetch`](#enhancedfetch) internally.

```ts
import { makeService } from 'make-service'

const service = makeService("https://example.com/api", {
  authorization: "Bearer 123"
})

const response = await service.get("/users")
const json = await response.json()
//    ^? unknown
```

On the example above, the `service.get` will call the [`enhancedFetch`](#enhancedfetch) with the following arguments:

```ts
// "https://example.com/api/users"
// {
//   method: 'GET',
//   headers: {
//    'content-type': 'application/json',
//    'authorization': 'Bearer 123',
//   }
// }
```

The `api` object can be called with the same arguments as the [`enhancedFetch`](#enhancedfetch), such as `query`, object-like `body`, and `trace`.

### Type-checking the response body
The `response` object returned by the `service` can be type-casted with a given generic type. This will type-check the `response.json()` and `response.text()` methods.

```ts
const response = await service.get("/users")
const users = await response.json<{ data: User[] }>()
//    ^? { data: User[] }
const content = await response.text<`${string}@${string}`>()
//    ^? `${string}@${string}`
```

### Runtime type-checking and parsing the response body
Its [`typedResponse`](#typedresponse) can also be parsed with a zod schema. Here follows a little more complex example:

```ts
const response = await service.get("/users")
const json = await response.json(
  z.object({
    data: z.object({
      users: z.array(z.object({
        name: z.string()
      }))
    })
  })
  // transformed and caught
  .transform(({ data: { users } }) => users)
  .catch([])
)
// type of json will be { name: string }[]

const content = await response.text(z.string().email())
// It will throw an error if the response.text is not a valid email
```

### Supported HTTP Verbs
Other than the `get` it also accepts more HTTP verbs:
```ts
await service.get("/users")
await service.post("/users", { body: { name: "John" } })
await service.put("/users/1", { body: { name: "John" } })
await service.patch("/users/1", { body: { name: "John" } })
await service.delete("/users/1")
await service.head("/users")
await service.options("/users")
```

### Headers
The `headers` argument can be a `Headers` object, an object with string keys and values, or an array of `[key, value]` tuples.
The `baseHeaders` and the `headers` will be merged together, with the `headers` taking precedence.

```ts
import { makeService } from 'make-service'

const service = makeService("https://example.com/api", new Headers({
  authorization: "Bearer 123",
  accept: "*/*",
}))

const response = await service.get("/users", {
  headers: [['accept', 'application/json']],
})

// It will call "https://example.com/api/users"
// with headers: { authorization: "Bearer 123", accept: "application/json" }
```

#### Passing a function as `baseHeaders`
The given `baseHeaders` can be a sync or async function that will run in every request before it gets merged with the other headers.
This is particularly useful when you need to send a refreshed token or add a timestamp to the request.

```ts
import { makeService } from 'make-service'

declare getAuthorizationToken: () => Promise<HeadersInit>

const service = makeService("https://example.com/api", async () => ({
  authorization: await getAuthorizationToken(),
}))

```

#### Deleting a previously set header
In case you want to delete a header previously set you can pass `undefined` or `'undefined'` as its value:
```ts
const service = makeService("https://example.com/api", { authorization: "Bearer 123" })
const response = await service.get("/users", {
  headers: new Headers({ authorization: 'undefined', "Content-Type": undefined }),
})
// headers will be empty.
```
Note: Don't forget headers are case insensitive.
```ts
const headers = new Headers({ 'Content-Type': 'application/json' })
Object.fromEntries(headers) // equals to: { 'content-type': 'application/json' }
```


### Base URL
The service function can receive a `string` or `URL` as base `url` and it will be able to merge them correctly with the given path:

```ts
import { makeService } from 'make-service'

const service = makeService(new URL("https://example.com/api"))

const response = await service.get("/users?admin=true")

// It will call "https://example.com/api/users?admin=true"
```

### Body
The function can also receive a `body` object that will be stringified and sent as the request body:

```ts
import { makeService } from 'make-service'

const service = makeService("https://example.com/api")
const response = await service.post("/users", {
  body: { person: { firstName: "John", lastName: "Doe" } },
})

// It will make a POST request to "https://example.com/api/users"
// with stringified body: "{\"person\":{\"firstName\":\"John\",\"lastName\":\"Doe\"}}"
```

You can also pass any other accepted `BodyInit` values as body, such as `FormData`, `URLSearchParams`, `Blob`, `ReadableStream`, `ArrayBuffer`, etc.

```ts
import { makeService } from 'make-service'

const service = makeService("https://example.com/api")
const formData = new FormData([["name", "John"], ["lastName", "Doe"]])
const response = await service.post("/users", {
  body: formData,
})
```

### Query
The service can also receive an `query` object that can be a `string`, a `URLSearchParams`, or an array of entries and it'll add that to the path as queryString:

```ts
import { makeService } from 'make-service'

const service = makeService(new URL("https://example.com/api"))

const response = await service.get("/users?admin=true", {
  query: new URLSearchParams({ page: "2" }),
})

// It will call "https://example.com/api/users?admin=true&page=2"

// It could also be:
const response = await service.get("/users?admin=true", {
  query: [["page", "2"]],
})
// or:
const response = await service.get("/users?admin=true", {
  query: "page=2",
})
```

### Params
The function can also receive a `params` object that will be used to replace the `:param` wildcards in the path:

```ts
import { makeService } from 'make-service'

const service = makeService(new URL("https://example.com/api"))
const response = await service.get("/users/:id/article/:articleId", {
  params: { id: "2", articleId: "3" },
})

// It will call "https://example.com/api/users/2/article/3"
```

### Trace
The function can also receive a `trace` function that will be called with the final `url` and `requestInit` arguments.
Therefore you can know what are the actual arguments that will be passed to the `fetch` API.

```ts
import { makeService } from 'make-service'

const service = makeService("https://example.com/api")
const response = await service.get("/users/:id", {
  params: { id: "2" },
  query: { page: "2"},
  headers: { Accept: "application/json" },
  trace: (url, requestInit) => {
    console.log("The request was sent to " + url)
    console.log("with the following params: " + JSON.stringify(requestInit))
  },
})

// It will log:
// "The request was sent to https://example.com/api/users/2?page=2"
// with the following params: { headers: { "Accept": "application/json", "Content-type": "application/json" } }
```

## enhancedFetch

A wrapper around the `fetch` service.
It returns a [`TypedResponse`](#typedresponse) instead of a `Response`.

```ts
import { enhancedFetch } from 'make-service'

const response = await enhancedFetch("https://example.com/api/users", {
  method: 'POST',
  body: { some: { object: { as: { body } } } }
})
const json = await response.json()
//    ^? unknown
// You can pass it a generic or schema to type the result
```

This function accepts the same arguments as the `fetch` API - with exception of [JSON-like body](#body) -, and it also accepts an object of [`params`](#params) to replace URL wildcards, an object-like [`query`](#query), and a [`trace`](#trace) function that will be called with the `url` and `requestInit` arguments.

This slightly different `RequestInit` is typed as `EnhancedRequestInit`.

```ts
import { enhancedFetch } from 'make-service'

await enhancedFetch("https://example.com/api/users/:role", {
  method: 'POST',
  body: { some: { object: { as: { body } } } },
  query: { page: "1" },
  params: { role: "admin" },
  trace: (url, requestInit) => console.log(url, requestInit)
})

// The trace function will be called with the following arguments:
// "https://example.com/api/users/admin?page=1"
// {
//   method: 'POST',
//   body: '{"some":{"object":{"as":{"body":{}}}}}',
//   headers: { 'content-type': 'application/json' }
// }
```

Notice: the `enhancedFetch` adds a `'content-type': 'application/json'` header by default.

## typedResponse

A type-safe wrapper around the `Response` object. It adds a `json` and `text` method that will parse the response with a given zod schema. If you don't provide a schema, it will return `unknown` instead of `any`, then you can also give it a generic to type cast the result.

```ts
import { typedResponse } from 'make-service'
import type { TypedResponse } from 'make-service'

// With JSON
const response: TypedResponse = typedResponse(new Response(JSON.stringify({ foo: "bar" })))
const json = await response.json()
//    ^? unknown
const json = await response.json<{ foo: string }>()
//    ^? { foo: string }
const json = await response.json(z.object({ foo: z.string() }))
//    ^? { foo: string }

// With text
const response: TypedResponse = typedResponse(new Response("foo"))
const text = await response.text()
//    ^? string
const text = await response.text<`foo${string}`>()
//    ^? `foo${string}`
const text = await response.text(z.string().email())
//    ^? string
```

## Thank you
I really appreciate your feedback and contributions. If you have any questions, feel free to open an issue or contact me on [Twitter](https://twitter.com/gugaguichard).
