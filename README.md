[![NPM](https://img.shields.io/npm/v/make-service)](https://www.npmjs.org/package/make-service)
![Library size](https://img.shields.io/bundlephobia/minzip/make-service)
[![All Contributors](https://img.shields.io/github/all-contributors/gustavoguichard/make-service?color=0375b6&style=flat-square)](#contributors)

# make-service

A type-safe thin wrapper around the `fetch` API to better interact with external APIs.

It adds a set of little features and allows you to parse responses with [standard-schema libraries](https://standardschema.dev).

## Features
- 🤩 Type-safe return of `response.json()` and `response.text()`. Defaults to `unknown` instead of `any`.
- 🚦 Easily setup an API with a `baseURL` and common options like `headers` for every request.
- 🏗️ Compose URL from the base by just calling the endpoints and an object-like `query`.
- 🐾 Replaces URL wildcards with a **strongly-typed** object of `params`.
- 🧙‍♀️ Automatically stringifies the `body` of a request so you can give it a JSON-like structure.
- 🐛 Accepts a `trace` function for debugging.
- 🔥 It can transform responses and payloads back and forth to (e.g.) support interchangeability of casing styles (kebab-case -> camelCase -> snake_case -> kebab-case).

## Example

```ts
const service = makeService("https://example.com/api", {
  headers: {
    Authorization: "Bearer 123",
  },
});

const response = await service.get("/users")
const users = await response.json(usersSchema);
//    ^? User[]
```

# Table of Contents
- [Installation](#installation)
- [API](#api)
  - [makeService](#makeservice)
    - [Type-checking the response body](#type-checking-the-response-body)
    - [Runtime type-checking and parsing the response body](#runtime-type-checking-and-parsing-the-response-body)
      - [Dealing with parsing errors](#dealing-with-parsing-errors)
    - [Supported HTTP Verbs](#supported-http-verbs)
    - [Headers](#headers)
      - [Passing a function as `headers`](#passing-a-function-as-headers)
      - [Deleting a previously set header](#deleting-a-previously-set-header)
    - [Base URL](#base-url)
    - [Transformers](#transformers)
      - [Request transformers](#request-transformers)
      - [Response transformers](#response-transformers)
    - [Body](#body)
    - [Query](#query)
    - [Params](#params)
    - [Trace](#trace)
  - [makeFetcher](#makefetcher)
  - [enhancedFetch](#enhancedfetch)
  - [typedResponse](#typedresponse)
- [Transform the payload](#transform-the-payload)
- [Other available primitives](#other-available-primitives)
  - [addQueryToURL](#addquerytourl)
  - [ensureStringBody](#ensurestringbody)
  - [makeGetApiURL](#makegetapiurl)
  - [mergeHeaders](#mergeheaders)
  - [replaceURLParams](#replaceurlparams)
- [Contributors](#contributors)
- [Acknowledgements](#acknowledgements)

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
The main function of this lib is built on top of the primitives described in the following sections. It allows you to create a service object with a `baseURL` and common options like `headers` for every request.

This service object can be called with every HTTP method and it will return a [`typedResponse`](#typedresponse).

```ts
import { makeService } from 'make-service'

const service = makeService("https://example.com/api", {
  headers :{
    authorization: "Bearer 123",
  },
})

const response = await service.get("/users")
const json = await response.json()
//    ^? unknown
```

On the example above, the request will be sent with the following arguments:

```ts
// "https://example.com/api/users"
// {
//   method: 'GET',
//   headers: {
//    'authorization': 'Bearer 123',
//   }
// }
```

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

Its [`typedResponse`](#typedresponse) can also be parsed with a standard schema parser. Here follows a little more complex example with Zod:
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
You can transform any `Response` in a `TypedResponse` like that by using the [`typedResponse`](#typedresponse) function.

#### Dealing with parsing errors
If the response body does not match the given schema, it will throw a **ParseResponseError** which will have a message carrying all the parsing issues and its messages. You can catch it to inspect the issues:

```ts
try {
  const response = await service.get("/users")
  return await response.json(userSchema)
} catch(error) {
  if (error instanceof ParseResponseError) {
    console.log(error.issues)
  }
}
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
The `headers` argument can be a `Headers` object, a `Record<string, string>`, or an array of `[key, value]` tuples (entries).
The `headers` option on `baseOptions` and the `headers` argument will be merged together, with the `headers` argument taking precedence.

```ts
import { makeService } from 'make-service'

const service = makeService("https://example.com/api", {
  headers: new Headers({
    authorization: "Bearer 123",
    accept: "*/*",
  }),
})

const response = await service.get("/users", {
  headers: [['accept', 'application/json']],
})

// It will call "https://example.com/api/users"
// with headers: { authorization: "Bearer 123", accept: "application/json" }
```

#### Passing a function as `headers`
The `headers` option on `baseOptions` can be a sync or async function that will run in every request before it gets merged with the other headers.
This is particularly useful when you need to send a refreshed token or add a timestamp to the request.

```ts
import { makeService } from 'make-service'

declare getAuthorizationToken: () => Promise<HeadersInit>

const service = makeService("https://example.com/api", {
  headers: async () => ({
    authorization: await getAuthorizationToken(),
  }),
})

```

#### Deleting a previously set header
In case you want to delete a header previously set you can pass `undefined` or `'undefined'` as its value:
```ts
const service = makeService("https://example.com/api", {
  headers: { authorization: "Bearer 123" },
})

const response = await service.get("/users", {
  headers: new Headers({ authorization: 'undefined' }),
})
// headers will be empty.
```
Note: Don't forget headers are case insensitive.
```ts
const headers = new Headers({ 'Content-Type': 'application/json' })
Object.fromEntries(headers) // equals to: { 'content-type': 'application/json' }
```

All the features above are done by using the [`mergeHeaders`](#mergeheaders) function internally.

### Base URL
The service function can receive a `string` or `URL` as base `url` and it will be able to merge them correctly with the given path:

```ts
import { makeService } from 'make-service'

const service = makeService(new URL("https://example.com/api"))

const response = await service.get("/users?admin=true")

// It will call "https://example.com/api/users?admin=true"
```
You can use the [`makeGetApiUrl`](#makegetapiurl) method to do that kind of URL composition.

### Transformers
`makeService` can also receive `requestTransformer` and `responseTransformer` as options that will be applied to all requests.

#### Request transformers
You can transform the request in any way you want passing a transformer function as a parameter. This will be applied to all requests for that service.
A useful example is to implement a global request timeout for all endpoints of a service:

```ts
function timeoutRequestIn30Seconds(
  request: EnhancedRequestInit<string>,
): EnhancedRequestInit<string> {
  const terminator = new AbortController()
  terminator.signal.throwIfAborted()
  setTimeout(() => terminator.abort(), 30000)

  return {
    ...request,
    signal: terminator.signal,
  }
}

const service = makeService('https://example.com/api', { requestTransformer: timeoutRequestIn30Seconds })

const response = await service.get("/users")

// It will call "https://example.com/api/users" aborting (and throwing an exception) if it takes more than 30 seconds.
```

Please note that the `headers` option will be applied _after_ the request transformer runs. If you're using a request transformer, we recommend adding custom headers inside your transformer instead of using both options.

#### Response transformers
You can also transform the response in any way you want, like:

```ts
const service = makeService('https://example.com/api', {
  responseTransformer: (response) => ({ ...response, statusText: 'It worked!' }),
})

const response = await service.get("/users")

// response.statusText will be 'It worked!'
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
This is achieved by using the [`ensureStringBody`](#ensurestringbody) function internally.

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
This is achieved by using the [`addQueryToURL`](#addquerytourl) function internally.

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
The `params` object will not type-check if the given object doesn't follow the path structure.
```ts
// @ts-expect-error
service.get("/users/:id", { params: { id: "2", foobar: "foo" } })
```

This is achieved by using the [`replaceURLParams`](#replaceurlparams) function internally.

### Trace
The function can also receive a `trace` function that will be called with the final `url` and `requestInit` arguments.
Therefore you can know what are the actual arguments that will be passed to the `fetch` API.

```ts
import { makeService } from 'make-service'

const service = makeService("https://example.com/api")
const response = await service.get("/users/:id", {
  params: { id: "2" },
  query: { page: "2"},
  headers: { Accept: "application/json", "Content-type": "application/json" },
  trace: (url, requestInit) => {
    console.log("The request was sent to " + url)
    console.log("with the following params: " + JSON.stringify(requestInit))
  },
})

// It will log:
// "The request was sent to https://example.com/api/users/2?page=2"
// with the following params: { headers: { "Accept": "application/json", "Content-type": "application/json" } }
```

## makeFetcher
This method is the same as [`makeService`](#make-service) but it doesn't expose the HTTP methods as properties of the returned object.
This is good for when you want to have a service setup but don't know the methods you'll be calling in advance, like in a proxy.

```ts
import { makeFetcher } from 'make-service'

const fetcher = makeFetcher("https://example.com/api")
const response = await fetcher("/users", { method: "POST", body: { email: "john@doe.com" } })
const json = await response.json()
//    ^? unknown
```

Other than having to pass the method in the `RequestInit` this is going to have all the features of [`makeService`](#make-service).

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

This function accepts the same arguments as the `fetch` API - with exception of [JSON-like body](#body) -, and it also accepts an object of [`params`](#params) to replace URL wildcards, an object-like [`query`](#query), and a [`trace`](#trace) function. Those are all described above in [`makeService`](#make-service).

This slightly different `RequestInit` is typed as `EnhancedRequestInit`.

```ts
import { enhancedFetch } from 'make-service'

await enhancedFetch("https://example.com/api/users/:role", {
  method: 'POST',
  body: { some: { object: { as: { body } } } },
  query: { page: "1" },
  params: { role: "admin" },
  trace: console.log,
})

// The trace function will be called with the following arguments:
// "https://example.com/api/users/admin?page=1"
// {
//   method: 'POST',
//   body: '{"some":{"object":{"as":{"body":{}}}}}',
// }
// Response {}
```

The `trace` function can also return a `Promise<void>` in order to send traces to an external service or database.

## typedResponse

A type-safe wrapper around the `Response` object. It adds a `json` and `text` method that will parse the response with a given standard schema library. If you don't provide a schema, it will return `unknown` instead of `any`, then you can also give it a generic to type cast the result.

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

# Transform the payload
The combination of `make-service` and [`string-ts`](https://github.com/gustavoguichard/string-ts) libraries makes it easy to work with APIs that follow a different convention for object key's casing, so you can transform the request body before sending it or the response body after returning from the server.
The resulting type will be **properly typed** 🤩.
```ts
import { makeService } from 'make-service'
import { deepCamelKeys, deepKebabKeys } from 'string-ts'

const service = makeService("https://example.com/api")
const response = service.get("/users")
const json = await response.json(
  z
    .array(z.object({ "first-name": z.string(), contact: z.object({ "home-address": z.string() }) }))
)
const users = deepCamelKeys(json)
console.log(users)
//          ^? { firstName: string, contact: { homeAddress: string } }[]

const body = deepKebabKeys({ firstName: "John", contact: { homeAddress: "123 Main St" } })
//    ^? { "first-name": string, contact: { "home-address": string } }
service.patch("/users/:id", { body, params: { id: "1" } })
```

# Other available primitives
This little library has plenty of other useful functions that you can use to build your own services and interactions with external APIs.

## addQueryToURL
It receives a URL instance or URL string and an object-like query and returns a new URL with the query appended to it.

It will preserve the original query if it exists and will also preserve the type of the given URL.

```ts
import { addQueryToURL } from 'make-service'

addQueryToURL("https://example.com/api/users", { page: "2" })
// https://example.com/api/users?page=2

addQueryToURL(
  "https://example.com/api/users?role=admin",
  { page: "2" },
)
// https://example.com/api/users?role=admin&page=2

addQueryToURL(
  new URL("https://example.com/api/users"),
  { page: "2" },
)
// https://example.com/api/users?page=2

addQueryToURL(
  new URL("https://example.com/api/users?role=admin"),
  { page: "2" },
)
// https://example.com/api/users?role=admin&page=2
```

## ensureStringBody
It accepts any value considered a `BodyInit` (the type of the body in `fetch`, such as `ReadableStream` | `XMLHttpRequestBodyInit` | `null`) and also accepts a JSON-like structure such as a number, string, boolean, array or object.

In case it detects a JSON-like structure it will return a stringified version of that payload. Otherwise the type will be preserved.

```ts
import { ensureStringBody } from 'make-service'

ensureStringBody({ foo: "bar" })
// '{"foo":"bar"}'
ensureStringBody("foo")
// 'foo'
ensureStringBody(1)
// '1'
ensureStringBody(true)
// 'true'
ensureStringBody(null)
// null
ensureStringBody(new ReadableStream())
// ReadableStream

// and so on...
```

## makeGetApiURL
It creates an URL builder for your API. It works similarly to [`makeFetcher`](#makefetcher) but will return the URL instead of a response.

You create a `getApiURL` function by giving it a `baseURL` and then it accepts a path and an optional [query](#query) that will be merged into the final URL.

```ts
import { makeGetApiURL } from 'make-service'

const getApiURL = makeGetApiURL("https://example.com/api")
const url = getApiURL("/users?admin=true", { page: "2" })

// "https://example.com/api/users?admin=true&page=2"
```

Notice the extra slashes are gonna be added or removed as needed.
```ts
makeGetApiURL("https://example.com/api/")("/users")
// "https://example.com/api/users"
makeGetApiURL("https://example.com/api")("users")
// "https://example.com/api/users"
```

## mergeHeaders
It merges multiple `HeadersInit` objects into a single `Headers` instance.
They can be of any type that is accepted by the `Headers` constructor, like a `Headers` instance, a plain object, or an array of entries.

```ts
import { mergeHeaders } from 'make-service'

const headers1 = new Headers({ "Content-Type": "application/json" })
const headers2 = { Accept: "application/json" }
const headers3 = [["accept", "*/*"]]

const merged = mergeHeaders(headers1, headers2, headers3)
//    ^? Headers({ "content-Type": "application/json", "accept": "*/*" })
```

It will delete previous headers if `undefined` or `"undefined"` is given:

```ts
import { mergeHeaders } from 'make-service'

const headers1 = new Headers({ "Content-Type": "application/json", Accept: "application/json" })
const headers2 = { accept: undefined }
const headers3 = [["content-type", "undefined"]]

const merged = mergeHeaders(headers1, headers2, headers3)
//    ^? Headers({})
```

## replaceURLParams
This function replaces URL wildcards with the given params.
```ts
import { replaceURLParams } from 'make-service'

const url = replaceURLParams(
  "https://example.com/users/:id/posts/:postId",
  { id: "2", postId: "3" },
)
// It will return: "https://example.com/users/2/posts/3"
```

The params will be **strongly-typed** which means they will be validated against the URL structure and will not type-check if the given object does not match that structure.

# Contributors

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/gustavoguichard"><img src="https://avatars.githubusercontent.com/u/566971?v=4?s=100" width="100px;" alt="Guga Guichard"/><br /><sub><b>Guga Guichard</b></sub></a><br /><a href="#code-gustavoguichard" title="Code">💻</a> <a href="#projectManagement-gustavoguichard" title="Project Management">📆</a> <a href="#promotion-gustavoguichard" title="Promotion">📣</a> <a href="#maintenance-gustavoguichard" title="Maintenance">🚧</a> <a href="#doc-gustavoguichard" title="Documentation">📖</a> <a href="#bug-gustavoguichard" title="Bug reports">🐛</a> <a href="#infra-gustavoguichard" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a> <a href="#question-gustavoguichard" title="Answering Questions">💬</a> <a href="#research-gustavoguichard" title="Research">🔬</a> <a href="#review-gustavoguichard" title="Reviewed Pull Requests">👀</a> <a href="#ideas-gustavoguichard" title="Ideas, Planning, & Feedback">🤔</a> <a href="#example-gustavoguichard" title="Examples">💡</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://www.linkedin.com/in/danielweinmann"><img src="https://avatars.githubusercontent.com/u/204765?v=4?s=100" width="100px;" alt="Daniel Weinmann"/><br /><sub><b>Daniel Weinmann</b></sub></a><br /><a href="#code-danielweinmann" title="Code">💻</a> <a href="#promotion-danielweinmann" title="Promotion">📣</a> <a href="#ideas-danielweinmann" title="Ideas, Planning, & Feedback">🤔</a> <a href="#doc-danielweinmann" title="Documentation">📖</a> <a href="#bug-danielweinmann" title="Bug reports">🐛</a> <a href="#review-danielweinmann" title="Reviewed Pull Requests">👀</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://luca.md"><img src="https://avatars.githubusercontent.com/u/1881266?v=4?s=100" width="100px;" alt="Andrei Luca"/><br /><sub><b>Andrei Luca</b></sub></a><br /><a href="#doc-iamandrewluca" title="Documentation">📖</a> <a href="#code-iamandrewluca" title="Code">💻</a> <a href="#promotion-iamandrewluca" title="Promotion">📣</a> <a href="#maintenance-iamandrewluca" title="Maintenance">🚧</a> <a href="#bug-iamandrewluca" title="Bug reports">🐛</a> <a href="#ideas-iamandrewluca" title="Ideas, Planning, & Feedback">🤔</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/diogob"><img src="https://avatars.githubusercontent.com/u/20662?v=4?s=100" width="100px;" alt="Diogo Biazus"/><br /><sub><b>Diogo Biazus</b></sub></a><br /><a href="#code-diogob" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/garusis"><img src="https://avatars.githubusercontent.com/u/15615652?v=4?s=100" width="100px;" alt="Marcos Javier Alvarez Maestre"/><br /><sub><b>Marcos Javier Alvarez Maestre</b></sub></a><br /><a href="#code-garusis" title="Code">💻</a> <a href="#bug-garusis" title="Bug reports">🐛</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

# Acknowledgements
This library is part of a code I've been carrying around for a while through many projects.

- [Seasoned](https://github.com/seasonedcc) - for backing my work and allowing me testing it on big codebases when I started sketching this API.
- [croods](https://github.com/seasonedcc/croods) by [@danielweinmann](https://github.com/danielweinmann) - a react data-layer library from pre-ReactQuery/pre-SWR era - gave me ideas and experience dealing with APIs after spending a lot of time in that codebase.
- [zod](https://zod.dev/) by [@colinhacks](https://github.com/colinhacks) changed my mindset about how to deal with external data.
- [zod-fetch](https://github.com/mattpocock/zod-fetch) by [@mattpocock](https://github.com/mattpocock) for the inspiration, when I realized I had a similar solution that could be extracted and be available for everyone to use.

I really appreciate your feedback and contributions. If you have any questions, feel free to open an issue or contact me on [Twitter](https://twitter.com/gugaguichard).
