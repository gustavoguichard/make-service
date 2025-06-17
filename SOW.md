# Statement of Work

## Overview

`make-service` is a TypeScript library that wraps the native `fetch` API with additional helpers to simplify communication with external HTTP services. It focuses on type safety and predictable request/response handling while remaining lightweight. The project exposes a group of primitives and a higher level `makeService` helper that combines them into a flexible API client.

This document provides a high level explanation of the design, patterns used and how to get started contributing or using the library.

## Features

- **Typed responses** – JSON and text parsing return strongly typed values. When given a [Standard Schema](https://standardschema.dev) parser the response is validated and decoding errors are captured in a `ParseResponseError` instance.
- **Base URL and request options** – `makeService`/`makeFetcher` allow declaring a base API URL with default headers, custom request and response transformers, and shared logic for all requests.
- **Request composition helpers** – Functions such as `addQueryToURL`, `ensureStringBody`, `replaceURLParams` and `mergeHeaders` help compose URLs, headers and bodies in a safe manner.
- **Trace hooks** – Optional trace callbacks receive the final URL, request init object and a clone of the response to aid debugging or metrics collection.
- **Transformers** – Both requests and responses can be modified globally through user provided functions, enabling custom logic like timeouts or normalisation of server payloads.
- **Utility wrappers** – `enhancedFetch` offers the same interface as `fetch` but with the above improvements, while `typedResponse` converts an existing `Response` into the enhanced format.

## Project Structure

- `src/api.ts` – Main implementations of `enhancedFetch`, `makeFetcher`, `makeService` and `typedResponse`.
- `src/primitives.ts` – Small functions used by the API layer for tasks like query building or header merging.
- `src/internals.ts` – Internal helpers for parsing JSON/text using the standard-schema libraries and throwing typed errors.
- `src/types.ts` – All TypeScript types for request options and helpers.
- Tests reside next to the source files using [Vitest](https://vitest.dev/).

The package is built with `tsup` and formatted with `biome`. Continuous integration runs linting, type checking and the test suite.

## Design Notes

The library favours composition and clear separation of concerns:

1. **Primitives First** – The functions in `src/primitives.ts` are small, pure utilities. They can be reused outside the main API and each has focused unit tests.
2. **Thin Wrappers** – `enhancedFetch` wraps `fetch`, adding parsing logic and parameter support. `makeFetcher` and `makeService` compose `enhancedFetch` with headers and transformers while keeping their surface minimal.
3. **Type Driven** – Generics are used extensively so that parameters such as URL path wildcards are enforced by the compiler. Response parsers maintain the type information of the schema provided.
4. **Runtime Flexibility** – Optional hooks (request/response transformers, trace callbacks) allow custom behaviour without modifying the core.

This architecture keeps the core library small and testable while still allowing advanced scenarios.

## Why use make-service?

Working directly with `fetch` often leads to `any` typed responses, manual URL composition and boilerplate for parsing JSON payloads. `make-service` removes this friction by offering:

- Automatic JSON/string handling for request bodies and responses.
- Strong typing of URL parameters and response data.
- A central place to configure base URL, headers and transformations.
- Small, dependency-light code that works both in browsers and Node.js.

Whether you only need the primitives or want a higher level service abstraction, the library scales with your requirements.

## Getting Started

1. **Read the examples in [README.md](README.md)** – They demonstrate the typical usage patterns and available options.
2. **Explore the tests** in `src/api.test.ts` and `src/primitives.test.ts` – They show how each feature behaves and how edge cases are handled.
3. **Run the tests** locally with `npm test` (which uses Vitest) to ensure your environment is set up correctly.
4. **Use `makeService` or `makeFetcher`** to build your API client. Start simple and gradually incorporate request/response transformers or typed schemas as needed.

## Contributing

- Run `npm run lint` and `npm run tsc` before committing to ensure code style and type correctness.
- Write or update tests for any changes. The suite aims for good coverage of the primitives and API wrappers.
- Keep new utilities small and documented so they can be composed easily.

## Conclusion

`make-service` provides a concise yet powerful approach to building API clients. By combining small utilities with well typed wrappers around `fetch`, it helps maintainable and predictable network code. Newcomers should begin with the README examples and corresponding tests to understand the flow, then dive into the source files starting with `api.ts` and `primitives.ts` for a deeper look.
