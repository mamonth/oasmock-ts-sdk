## API Reference

Full reference for `MockSDK` / `MockSDKRequest` and the public type definitions. Concept semantics shared with the OASMock server (runtime expressions, example behavior) are referenced from the [OASMock docs](../node_modules/oasmock/README.md) rather than restated here.

### Class `MockSDK`

#### Constructor

```typescript
constructor(baseUrl: string)
```

Creates a new SDK instance pointing to the mock server at `baseUrl`. The SDK automatically appends `/_mock` to the provided URL.

#### Methods

##### `onRequest(path: string, method?: TMethod): MockSDKRequest`

Returns a `MockSDKRequest` builder for the given path and HTTP method (default `'GET'`).

##### `setExample(conditions: IRequestConditions, exampleData: IResponseData): Promise<string>`

Low‑level method to add a mock example. Returns a promise that resolves with the example ID.

##### `getRequestList(options?: IGetRequestHistoryOptions): Promise<IRequestHistoryItem[]>`

Retrieves the request history, optionally filtered by the provided options.

##### `getLastRequest(options?: IGetRequestHistoryOptions): Promise<IRequestHistoryItem | undefined>`

Retrieves the most recent matching request from the history.

##### Static `toConditionKey(type: string, value: string): string`

Utility to create a runtime-expression condition key (e.g., `'query'`, `'id'` → `'{$request.query.id}'`). See [runtime expressions](../node_modules/oasmock/docs/extensions.md) for supported types.

### Class `MockSDKRequest`

Builder for defining a mock example with chainable condition methods.

#### Properties

- `conditions: IRequestConditions` – the accumulated conditions.
- `readonly sdk: MockSDK` – reference to the parent SDK instance.

#### Methods

##### `withHeaders(headers: HeaderRecord): this`

Adds header conditions.

##### `withSearchParams(params: URLSearchParamsInit): this`

Adds query parameter conditions.

##### `withCookies(cookies: CookieRecord): this`

Adds cookie conditions.

##### `respondWith(responseData: IResponseData): Promise<string>`

Adds the example with the given response data. Returns the example ID.

##### `respondWithOnce(responseData: IResponseData): Promise<string>`

Adds a one‑time example (removed after first match). Returns the example ID.

## Type Definitions

```typescript
type TMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE' | 'HEAD' | 'OPTIONS';

interface IResponseData {
  once?: boolean;
  validate?: boolean;
  ttl?: number;
  code?: number;
  body?: string | number | boolean | unknown[] | { [key: string]: unknown };
  headers?: Record<string, string | string[]>;
}

interface IRequestConditions {
  path: string;
  method?: TMethod;
  [key: string]: unknown;
}

interface IRequestHistoryItem {
  ts: number;
  url: string;
  method: TMethod;
  body?: string | number | boolean | unknown[] | { [key: string]: unknown };
  headers: Record<string, string | string[]>;
}

interface IGetRequestHistoryOptions {
  path?: string;
  method?: TMethod;
  limit?: number;
  offset?: number;
  since?: number | string;  // milliseconds or relative string (e.g. '-10s')
  till?: number | string;   // milliseconds or relative string (e.g. '+2h')
}

type HeaderRecord = Record<string, string | string[]>;

type CookieRecord = Record<string, string>;

type URLSearchParamsInit =
  | URLSearchParams
  | string
  | Record<string, string | readonly string[]>
  | Iterable<[string, string]>;
```

The semantics of `once`, `validate`, `ttl`, `code`, and conditions mirror the server's [`AddExampleRequest`](../node_modules/oasmock/api/openapi.yaml).

## Error Handling

All methods return promises that reject with an `Error` if the HTTP request fails or the server returns an error response.
