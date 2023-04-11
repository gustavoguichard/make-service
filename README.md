# make-service

A type-safe thin wrapper around the `fetch` API to better interact with external APIs.

It adds a set of little features and allows you to parse responses with [zod](https://github.com/colinhacks/zod).

## Features
- 🤩 Type-safe return of `response.json()` and `response.text()`. Defaults to `unknown` instead of `any`.
- 🚦 Easily setup an API with a `baseURL` and common `headers` for every request.
- 🏗️ Compose URL from the base by just calling the endpoints and an object-like `query`.
- 🧙‍♀️ Automatically stringifies the `body` of a request so you can give it a JSON-like structure.
- 🐛 Accepts a `trace` function for debugging.

## Example

```ts
const api = makeService("https://example.com/api", {
  Authorization: "Bearer 123",
});

const response = await api.get("/users")
const users = await response.json(usersSchema);
//    ^? User[]
```

## Installation

```sh
npm install make-service
```
Or you can use it with Deno:

```ts
import { makeService } from "https://deno.land/x/make_service/mod.ts";
```

# Public API

This library exports the `makeService` function and all primitives used to build it. You can use the primitives as you wish but the `makeService` will have all the features combined.

## addQueryToInput

Adds an object of query parameters to a string or URL.

```ts
import { addQueryToInput } from 'make-service'

const input = addQueryToInput("https://example.com", { page: "1" })
// input = "https://example.com?page=1"

const input = addQueryToInput("https://example.com?page=1", { admin: "true" })
// input = "https://example.com?page=1&admin=true"

const input = addQueryToInput(new URL("https://example.com"), { page: "1" })
// input.toString() = "https://example.com?page=1"
```

## makeGetApiUrl

Creates a function that will add an endpoint and a query to the base URL.
It uses the `addQueryToInput` function internally.

```ts
import { makeGetApiUrl } from 'make-service'

const getApiUrl = makeGetApiUrl("https://example.com/api")

const url = getApiUrl("/users", { page: "1" })
// url = "https://example.com/api/users?page=1"
```

## ensureStringBody

Ensures that the body is a string. If it's not, it will be stringified.

```ts
import { ensureStringBody } from 'make-service'

const body1 = ensureStringBody({ foo: "bar" })
// body1 = '{"foo":"bar"}'
await fetch("https://example.com/api/users", {
  method: 'POST',
  body: body1
})

const body2 = ensureStringBody('{"foo":"bar"}')
// body2 = '{"foo":"bar"}'
await fetch("https://example.com/api/users", {
  method: 'POST',
  body: body2
})
```

## typedResponse

A type-safe wrapper around the `Response` object. It adds a `json` and `text` method that will parse the response with a given zod schema. If you don't provide a schema, it will return `unknown` instead of `any`, then you can also give it a generic to type cast the result.

```ts
import { typedResponse } from 'make-service'

// With JSON
const response = new Response(JSON.stringify({ foo: "bar" }))
const json = await typedResponse(response).json()
//    ^? unknown
const json = await typedResponse(response).json<{ foo: string }>()
//    ^? { foo: string }
const json = await typedResponse(response).json(z.object({ foo: z.string() }))
//    ^? { foo: string }

// With text
const response = new Response("foo")
const text = await typedResponse(response).text()
//    ^? string
const text = await typedResponse(response).text<`foo${string}`>()
//    ^? `foo${string}`
const text = await typedResponse(response).text(z.string().email())
//    ^? string
```

## enhancedFetch

A wrapper around the `fetch` API.
It uses the `addQueryToInput`, `ensureStringBody` function internally and returns a `typedResponse` instead of a `Response`.

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

This function accepts the same arguments as the `fetch` API - with exception of JSON-like body -, and it also accepts an object-like `query` and a `trace` function that will be called with the `input` and `requestInit` arguments.

```ts
import { enhancedFetch } from 'make-service'

await enhancedFetch("https://example.com/api/users", {
  method: 'POST',
  body: { some: { object: { as: { body } } } },
  query: { page: "1" },
  trace: (input, requestInit) => console.log(input, requestInit)
})

// The trace function will be called with the following arguments:
// "https://example.com/api/users?page=1"
// {
//   method: 'POST',
//   body: '{"some":{"object":{"as":{"body":{}}}}}',
//   headers: { 'content-type': 'application/json' }
// }
```

Notice: the `enhancedFetch` adds a `'content-type': 'application/json'` header by default.

# makeService

The main function of this lib is built on top of the previous primitives and it allows you to create an "API" object with a `baseURL` and common `headers` for every request.

This "api" object can be called with every HTTP method and it will return a `typedResponse` object as it uses the `enhancedFetch` internally.

```ts
import { makeService } from 'make-service'

const api = makeService("https://example.com/api", {
  authorization: "Bearer 123"
})

const response = await api.get("/users")
const json = await response.json()
//    ^? unknown
```

On the example above, the `api.get` will call the `enhancedFetch` with the following arguments:

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

The `api` object can be called with the same arguments as the `enhancedFetch`, such as `query`, object-like `body`, and `trace`.

Its `typedResponse` can also be parsed with a zod schema. Here follows a little more complex example:

```ts
const response = await api.get("/users", {
  query: { search: "John" },
  trace: (input, requestInit) => console.log(input, requestInit),
})
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
// the URL called will be "https://example.com/api/users?search=John"
```

It accepts more HTTP verbs:
```ts
await api.post("/users", { body: { name: "John" } })
await api.put("/users/1", { body: { name: "John" } })
await api.patch("/users/1", { body: { name: "John" } })
await api.delete("/users/1")
await api.head("/users")
await api.options("/users")
```

## Thank you
I really appreciate your feedback and contributions. If you have any questions, feel free to open an issue or contact me on [Twitter](https://twitter.com/gugaguichard).
