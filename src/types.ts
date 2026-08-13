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
