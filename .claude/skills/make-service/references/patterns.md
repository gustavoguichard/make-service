# make-service Patterns & Real-World Usage

## Pattern 1: Simple Service with Static Headers

```ts
import { makeService } from 'make-service'

const service = makeService('https://challenges.cloudflare.com/', {
  headers: { 'content-type': 'application/json' },
})

const response = await service.post('turnstile/v0/siteverify', {
  body: { secret: getEnv().secretKey, response: token },
})
```

## Pattern 2: Path Params and Schema Validation

```ts
import { makeService } from 'make-service'
import { z } from 'zod'

const ipService = makeService('https://geolite.info/geoip/v2.1/', {
  headers: {
    Authorization: `Basic ${btoa(`${getEnv().accountId}:${getEnv().licenseKey}`)}`,
  },
})

const getCountry = async (ip: string) => {
  const response = await ipService.get('country/:ip', { params: { ip } })
  if (!response.ok) return null
  return response.json(
    z.object({
      country: z.object({
        iso_code: z.string(),
        names: z.object({ en: z.string() }),
      }),
    })
  )
}
```

## Pattern 3: Error Handling

Check `response.ok` and parse error bodies with a generic type:

```ts
const response = await api.post('users', { body: { name, email } })

if (!response.ok) {
  const json = await response.json<{ message?: string }>()
  throw new Error(json.message ?? 'Request failed')
}

return response.json(userSchema)
```

Branch on specific status codes:

```ts
const response = await api.get('products/:id', { params: { id } })

if (response.status === 404) return null
if (!response.ok) throw new Error(`Unexpected status: ${response.status}`)
return response.json(productSchema)
```

## Pattern 4: Basic Auth with Request Transformer

```ts
import { makeService } from 'make-service'
import { deepSnakeKeys } from 'string-ts'

const service = makeService('https://support.example.com/api', {
  headers: {
    authorization: `Basic ${btoa(`${getEnv().email}:${getEnv().apiKey}`)}`,
    'content-type': 'application/json',
  },
  requestTransformer: (request) => ({
    ...request,
    body: deepSnakeKeys(request.body),
  }),
})
```

## Pattern 5: Schema Validation + deepCamelKeys Transform

Combine `requestTransformer` for outgoing snake_case with Zod `.transform(deepCamelKeys)` for incoming camelCase. Useful with any snake_case API.

```ts
import { makeService } from 'make-service'
import { deepCamelKeys, deepSnakeKeys } from 'string-ts'
import { z } from 'zod'

const service = makeService('https://api.example.com/v1', {
  headers: {
    authorization: `Bearer ${getEnv().apiKey}`,
    'content-type': 'application/json',
  },
  requestTransformer: (request) => ({
    ...request,
    body: deepSnakeKeys(request.body),
  }),
})

const getOrder = async (id: string) => {
  const response = await service.get('orders/:id', { params: { id } })
  return response.json(
    z.object({
      order_id: z.string(),
      created_at: z.string(),
      line_items: z.array(
        z.object({
          product_name: z.string(),
          unit_price: z.number(),
        })
      ),
    }).transform(deepCamelKeys)
  )
  // Result type: { orderId: string, createdAt: string, lineItems: { productName: string, unitPrice: number }[] }
}
```

## Pattern 6: Extracting the Service Type

Use `ReturnType` to extract the service type for dependency injection:

```ts
const service = makeService('https://api.example.com', {
  headers: { 'content-type': 'application/json' },
})

type API = typeof service

const getUser = (api: API) => async (id: string) => {
  const response = await api.get('users/:id', { params: { id } })
  return response.json(userSchema)
}
```

When wrapping `makeService` in a factory function, extract the return type:

```ts
type API = ReturnType<typeof createApi>

const createApi = (token: string) =>
  makeService('https://api.example.com', {
    headers: { authorization: `Bearer ${token}` },
  })
```

## Pattern 7: Dynamic Headers + Response Transformer for Rotating Credentials

Useful when working with backends that rotate auth tokens on every response (e.g. Rails + devise-token-auth). Dynamic `headers()` reads the latest credentials, and `responseTransformer` captures rotated tokens from response headers.

```ts
import { makeService } from 'make-service'
import { camelKeys, deepSnakeKeys } from 'string-ts'

type API = ReturnType<typeof createApi>

const createApi = (session: SessionStorage) =>
  makeService('https://api.example.com', {
    headers: () => {
      const headers = new Headers({ 'content-type': 'application/json' })
      const tokens = session.get('auth')
      if (tokens) {
        headers.set('access-token', tokens.accessToken)
        headers.set('uid', tokens.uid)
        headers.set('client', tokens.client)
        headers.set('expiry', tokens.expiry)
      }
      return headers
    },
    requestTransformer: (request) => ({
      ...request,
      body: deepSnakeKeys(request.body),
    }),
    responseTransformer: (response) => {
      const headers = camelKeys(Object.fromEntries(response.headers))
      if (headers.accessToken) {
        session.set('auth', {
          accessToken: headers.accessToken,
          uid: headers.uid,
          client: headers.client,
          expiry: headers.expiry,
        })
      }
      return response
    },
  })
```

## string-ts Integration Summary

| Function | Purpose | Where |
|---|---|---|
| `deepSnakeKeys()` | Convert camelCase body to snake_case before sending | `requestTransformer` |
| `deepCamelKeys()` | Convert snake_case response to camelCase | Zod `.transform()` |
| `camelKeys()` | Convert kebab-case headers to camelCase | `responseTransformer` |

The typical combo:
- **Outgoing**: `requestTransformer` with `deepSnakeKeys(request.body)` for snake_case APIs
- **Incoming**: Zod schema `.transform(deepCamelKeys)` for type-safe camelCase output
- **Headers**: `camelKeys(Object.fromEntries(response.headers))` in `responseTransformer`
