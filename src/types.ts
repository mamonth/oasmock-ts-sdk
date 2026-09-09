/**
 * HTTP method used to match a mocked request.
 */
export type TMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE' | 'HEAD' | 'OPTIONS';

/**
 * Describes a mock response the server should return for matching requests.
 */
export interface IResponseData {
  /**
   * When true, the example is returned only once.
   */
  once?: boolean;

  /**
   * When true (default), the response is validated against the OpenAPI schema.
   */
  validate?: boolean;

  /**
   * Time-to-live in seconds; 0 or omitted means no expiration.
   */
  ttl?: number;

  /**
   * HTTP status code of the mocked response (default 200).
   */
  code?: number;

  /**
   * Response body (JSON, text, number, or boolean).
   */
  body?: string | number | boolean | unknown[] | { [key: string]: unknown };

  /**
   * Response headers to return.
   */
  headers?: Record<string, string | string[]>;
}

/**
 * Conditions describing which incoming request a mock example matches.
 * May include extra keys (e.g. body, state, env) matching the server runtime expressions.
 */
export interface IRequestConditions {
  /**
   * Request path (including path parameters) to match.
   */
  path: string;

  /**
   * HTTP method to match (defaults to GET).
   */
  method?: TMethod;
  [key: string]: unknown;
}

/**
 * A single request recorded by the mock server.
 */
export interface IRequestHistoryItem {
  /**
   * Timestamp of the request, milliseconds since epoch.
   */
  ts: number;

  /**
   * Full request URL.
   */
  url: string;

  /**
   * HTTP method used for the request.
   */
  method: TMethod;

  /**
   * Request body, when present.
   */
  body?: string | number | boolean | unknown[] | { [key: string]: unknown };

  /**
   * Request headers.
   */
  headers: Record<string, string | string[]>;
}

/**
 * Options for filtering the mock server request history.
 */
export interface IGetRequestHistoryOptions {
  /**
   * Filter by request path.
   */
  path?: string;

  /**
   * Filter by HTTP method.
   */
  method?: TMethod;

  /**
   * Maximum number of records to return (default 100).
   */
  limit?: number;

  /**
   * Pagination offset.
   */
  offset?: number;

  /**
   * Start of the time range: epoch-ms timestamp or a relative string like '-10s'.
   */
  since?: number | string;

  /**
   * End of the time range: epoch-ms timestamp or a relative string like '+2h'.
   */
  till?: number | string;
}

/**
 * Accepted forms for query params: URLSearchParams, string, record, or iterable of pairs.
 */
export type URLSearchParamsInit =
  | URLSearchParams
  | string
  | Record<string, string | readonly string[]>
  | Iterable<[string, string]>;

/**
 * Cookie name to value mapping.
 */
export type CookieRecord = Record<string, string>;

/**
 * Header name to value (or values) mapping.
 */
export type HeaderRecord = Record<string, string | string[]>;

/**
 * Built-in event triggers and the wildcard sentinel for the async API.
 * Custom event names are passed as plain strings.
 */
export const SDKEvent = {
  CONNECT: 'connect',
  RECEIVE: 'receive',
  ANY: '*',
} as const;

export type SDKEvent = (typeof SDKEvent)[keyof typeof SDKEvent];

/**
 * A duration: a number (server-native unit: milliseconds for delay/interval,
 * seconds for ttl) or a string like '500ms', '1s', '2m', '1h', '1d'.
 */
export type TDuration = number | string;

/**
 * AsyncAPI transport protocol used when targeting a channel.
 */
export type TAsyncProtocol = 'ws' | 'http';

/**
 * Conditions for an async example. Keys are full runtime-expression keys
 * (e.g. '{$event.name}', '{$connection.id}'); values are literal or JSON schemas.
 */
export type TAsyncConditions = Record<string, unknown>;

/**
 * Options accepted when registering an async example via push/pushOnce.
 */
export interface IAsyncPushOptions {
  /**
   * Time-to-live: number of seconds (server-native) or a duration string.
   */
  ttl?: TDuration;
  /**
   * When true (default), the payload is validated against the channel schema.
   */
  validate?: boolean;
  /**
   * When true, the example is delivered only once then removed.
   */
  once?: boolean;
}

/**
 * A mock example bound to an AsyncAPI channel trigger (event or interval).
 */
export interface IAsyncExample {
  /**
   * Adds match conditions (full runtime-expression keys) to the example.
   * Not allowed on interval examples.
   */
  withConditions(conditions: TAsyncConditions): this;
  /**
   * Registers the example and returns its ID.
   */
  push(payload: unknown, opts?: IAsyncPushOptions): Promise<string>;
}

/**
 * An event-driven async example builder.
 */
export interface IAsyncEventExample extends IAsyncExample {
  /**
   * Delays emission after the event fires (milliseconds or duration string).
   */
  withDelay(timer: TDuration): IAsyncEventExample;
  /**
   * Registers a one-shot event-driven example (removed after first delivery).
   */
  pushOnce(payload: unknown, opts?: Omit<IAsyncPushOptions, 'once'>): Promise<string>;
}

/**
 * Options for firing a named event.
 */
export interface IFireEventOptions {
  payload?: Record<string, unknown>;
  /**
   * Delivery delay in milliseconds (or duration string).
   */
  delay?: TDuration;
  /**
   * When true, the event broadcasts over all loaded schemas.
   */
  global?: boolean;
}

/**
 * Options for pushing a message to channel consumers.
 */
export interface IPushMessageOptions {
  /**
   * Target a specific consumer; omitted broadcasts to all.
   */
  connectionId?: string;
  payload?: unknown;
  /**
   * Delivery delay in milliseconds (or duration string).
   */
  delay?: TDuration;
}

/**
 * Options for force-disconnecting a consumer.
 */
export interface IDisconnectOptions {
  code?: number;
  reason?: string;
  /**
   * Simulate an abrupt network drop (no close frame).
   */
  abrupt?: boolean;
}

/**
 * A connected channel consumer with convenience actions backed by the SDK.
 * Returned by getList()/getConsumerList(); a point-in-time snapshot.
 */
export interface IConsumer {
  connectionId: string;
  channel: string;
  protocol: 'ws' | 'signalr';
  streams?: Array<{ connectionId?: string; invocationId?: string; streamId?: string }>;
  disconnect(options?: IDisconnectOptions): Promise<void>;
  push(payload: unknown): Promise<void>;
}

/**
 * Facade bound to an AsyncAPI channel address (prefix included).
 */
export interface IAsyncChannel {
  onEvent(event: SDKEvent | string): IAsyncEventExample;
  onInterval(timer: TDuration): IAsyncExample;
  /**
   * Instantly pushes a message to all consumers of this channel.
   */
  push(payload: unknown): Promise<void>;
  /**
   * Fires a named event (same as MockSDK.fireEvent).
   */
  fireEvent(name: string, opts?: IFireEventOptions): Promise<void>;
  getConsumerList(): Promise<IConsumer[]>;
}

/** Management stream notification envelopes (GET /_mock/stream). */
export interface IEventEnvelope {
  type: 'event';
  ts?: number;
  event: {
    name?: string;
    schema?: string;
    global?: boolean;
    payload?: Record<string, unknown>;
  };
}

export interface IPushEnvelope {
  type: 'push';
  ts?: number;
  push: {
    channel?: string;
    connectionId?: string;
    payload?: Record<string, unknown>;
  };
}

export interface IConsumerEnvelope {
  type: 'consumer';
  ts?: number;
  consumer: {
    action?: 'connected' | 'disconnected';
    connectionId?: string;
    channel?: string;
    protocol?: 'ws' | 'signalr';
    streams?: Array<Record<string, unknown>>;
  };
}

export interface IScheduleEnvelope {
  type: 'schedule';
  ts?: number;
  schedule: {
    action?: 'started' | 'stopped';
    exampleId?: string;
    channel?: string;
    interval?: number;
  };
}

export type IManageEnvelope =
  | IEventEnvelope
  | IPushEnvelope
  | IConsumerEnvelope
  | IScheduleEnvelope;

/** Envelope types that are selected by type (event envelopes are selected by name). */
export type TStreamHostType = 'push' | 'consumer' | 'schedule';

/** A WebSocket minimal surface used by the management stream (browser/Node compatible). */
export interface WebSocketLike {
  addEventListener(
    type: 'open' | 'message' | 'close' | 'error',
    listener: (event: unknown) => void
  ): void;
  close(code?: number, reason?: string): void;
}

/** Factory for the management stream WebSocket; injectable for tests/Node pre-22. */
export type TWebSocketFactory = (url: string) => WebSocketLike;

/** Optional construction options for MockSDK. */
export interface IMockSDKOptions {
  wsFactory?: TWebSocketFactory;
}

/** Removes a stream subscription. */
export type Unsubscribe = () => void;
