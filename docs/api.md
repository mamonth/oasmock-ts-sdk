## API Reference

Full reference for `MockSDK` / `MockSDKRequest` and the public type definitions. Concept semantics shared with the OASMock server (runtime expressions, example behavior) are referenced from the [OASMock docs](../node_modules/oasmock/README.md) rather than restated here.

> **Experimental**: the async (AsyncAPI) management API — `asyncChannel`, async example builders,
> `fireEvent`, `pushToChannel`, consumer management — and the management notification stream
> (`sdk.on(...)`) are **experimental**. Their signatures, semantics, and envelope shapes may
> change without a backward-compatibility guarantee. The sync (`onRequest`/`setExample`) and
> history (`getRequestList`/`getLastRequest`) APIs are stable.

### Class `MockSDK`

#### Constructor

```typescript
constructor(baseUrl: string, options?: IMockSDKOptions)
```

Creates a new SDK instance pointing to the mock server at `baseUrl`. The SDK automatically appends `/_mock` to the provided URL.

`IMockSDKOptions` has a single optional field:

- `wsFactory?: (url: string) => WebSocketLike` – injects a WebSocket factory for the management stream. Defaults to the global `WebSocket` (browser / Node 22+). Needed for environments without a global `WebSocket`.

#### Methods

##### `onRequest(path: string, method?: TMethod): MockSDKRequest`

Returns a `MockSDKRequest` builder for the given path and HTTP method (default `'GET'`).

##### `asyncChannel(address: string, protocol?: TAsyncProtocol): IAsyncChannel`

Binds to an AsyncAPI channel. The address must include the schema prefix as mounted on the server (e.g. `/schema-prefix/user/updates`). `protocol` defaults to `'ws'` (`'http'` and `'signalr'` supported — `'signalr'` targets a channel served by a SignalR hub). Returns a channel facade with `onEvent`, `onInterval`, `push`, `fireEvent`, and `getConsumerList`.

##### `asyncConsumers`

Facade for the connected consumer ledger:

```typescript
sdk.asyncConsumers.getList(): Promise<IConsumer[]>
sdk.asyncConsumers.disconnect(connectionId: string, options?: IDisconnectOptions): Promise<void>
```

##### `setExample(conditions: IRequestConditions, exampleData: IResponseData): Promise<string>`

Low‑level method to add a mock example. Returns a promise that resolves with the example ID.

##### `deleteExample(exampleId: string): Promise<void>`

Removes a dynamically added example, cancelling any recurring (interval) delivery registered under that ID.

##### `fireEvent(name: string, options?: IFireEventOptions): Promise<void>`

Fires a named event (`POST /_mock/events`). Fires are broadcast over all loaded schemas unless `options.global` is explicitly `false`.

```typescript
interface IFireEventOptions {
  payload?: Record<string, unknown>;
  delay?: TDuration;   // ms or duration string
  global?: boolean;    // default true
}
```

##### `pushToChannel(channel: string, options?: IPushMessageOptions): Promise<void>`

Directly pushes a message to a channel's consumers (targeted via `connectionId` or broadcast).

```typescript
interface IPushMessageOptions {
  connectionId?: string;
  payload?: unknown;   // any JSON value (object, array, or scalar), delivered verbatim
  delay?: TDuration;
}
```

The payload may be any JSON value — object, array, or scalar — delivered verbatim as the channel message / SignalR stream `item`. Object payloads are templated with `{$state.*}`/`{$env.*}`; arrays and scalars pass through untouched.

##### `getConsumerList(channel?: string): Promise<IConsumer[]>`

Returns the currently connected consumers (all channels when `channel` is omitted) as `IConsumer` wrappers.

##### `disconnectConsumer(connectionId: string, options?: IDisconnectOptions): Promise<void>`

Force‑disconnects a consumer. `IDisconnectOptions` accepts `code`, `reason`, and `abrupt` (simulates a network drop).

##### `on(...)`: management stream subscription

Subscribes to the management WebSocket stream. The socket opens lazily on the first subscription and closes when the last handler is unsubscribed.

```typescript
// event envelopes by event name (e.g. a fired event 'user.created')
const off = sdk.on('user.created', (envelope: IEventEnvelope) => { ... });
off(); // unsubscribe

// envelope types
sdk.on('push', (envelope: IPushEnvelope) => { ... });
sdk.on('consumer', (envelope: IConsumerEnvelope) => { ... });
sdk.on('schedule', (envelope: IScheduleEnvelope) => { ... });
```

`SDKEvent.CONNECT`/`SDKEvent.RECEIVE` are the built‑in trigger names sent as `event` envelopes, but the server only emits them while a matching event-driven subscriber exists (e.g. an `onEvent(SDKEvent.CONNECT)` example). For connection lifecycle use `sdk.on('consumer', ...)`, which always emits `connected`/`disconnected` envelopes.

##### `getRequestList(options?: IGetRequestHistoryOptions): Promise<IRequestHistoryItem[]>`

Retrieves the request history, optionally filtered by the provided options.

##### `getLastRequest(options?: IGetRequestHistoryOptions): Promise<IRequestHistoryItem | undefined>`

Retrieves the most recent matching request from the history.

##### Static `toConditionKey(type: string, value: string): string`

Utility to create a runtime-expression condition key (e.g., `'query'`, `'id'` → `'{$request.query.id}'`, `'event'`, `'name'` → `'{$event.name}'`). See [runtime expressions](../node_modules/oasmock/docs/extensions.md) for supported types.

### Interface `IAsyncChannel`

```typescript
interface IAsyncChannel {
  onEvent(event: SDKEvent | string): IAsyncEventExample;
  onInterval(timer: TDuration): IAsyncExample;
  push(payload: unknown): Promise<void>;   // instant broadcast
  fireEvent(name: string, opts?: IFireEventOptions): Promise<void>;
  getConsumerList(): Promise<IConsumer[]>;
}
```

### Async example builders

```typescript
interface IAsyncExample {
  withConditions(conditions: TAsyncConditions): this; // rejects on interval examples
  push(payload: unknown, opts?: IAsyncPushOptions): Promise<string>;
}

interface IAsyncEventExample extends IAsyncExample {
  withDelay(timer: TDuration): IAsyncEventExample;
  pushOnce(payload: unknown, opts?: Omit<IAsyncPushOptions, 'once'>): Promise<string>;
}

interface IAsyncPushOptions {
  ttl?: TDuration;    // number = seconds, or duration string
  validate?: boolean;
  once?: boolean;
}
```

Notes:

- The event identity is pinned to `{$event.name}` and matched **exactly** by the server. `SDKEvent.ANY` (wildcard) is not supported for event examples and throws with guidance; use `sdk.on(SDKEvent.ANY, ...)` and push manually instead.
- `{$event.<field>}` templates resolve against the event payload in the message body; `{$event.data}` is the whole payload. `{$event.data.<field>}` is not a valid template path.
- Interval examples are single‑trigger: `withConditions` throws.
- `deleteExample(id)` stops periodic (interval) delivery.

### `IConsumer`

```typescript
interface IConsumer {
  connectionId: string;
  channel: string;
  protocol: 'ws' | 'signalr';
  streams?: Array<{ connectionId?: string; invocationId?: string; streamId?: string }>;
  path?: string;   // concrete SignalR hub upgrade path (incl. per-account path params)
  disconnect(options?: IDisconnectOptions): Promise<void>;
  push(payload: unknown): Promise<void>;
}
```

`getList()`/`getConsumerList()` return a point‑in‑time snapshot; `disconnect()`/`push()` issue fresh server calls each time. The optional `path` field is present on SignalR consumers and carries the concrete hub upgrade path (including captured path‑parameter values such as a per‑account `accountId` segment), enabling a targeted push to select one logical account's connections on a shared hub channel.

### Management stream envelopes

```typescript
type IManageEnvelope =
  | IEventEnvelope      // { type: 'event',    ... }
  | IPushEnvelope       // { type: 'push',     ... }
  | IConsumerEnvelope   // { type: 'consumer', ... }
  | IScheduleEnvelope;  // { type: 'schedule', ... }
```

Shapes follow the [AsyncAPI control spec](../node_modules/oasmock/api/asyncapi.yaml).

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

type TAsyncProtocol = 'ws' | 'http' | 'signalr';

/** ms-based for delay/interval; seconds-based for ttl — number = server-native unit */
type TDuration = number | string;

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