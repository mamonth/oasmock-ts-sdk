import { MockSDK } from './mock-sdk';
import type {
  CookieRecord,
  HeaderRecord,
  IRequestConditions,
  IResponseData,
  URLSearchParamsInit,
} from './types';

/**
 * Fluent builder that accumulates request-matching conditions for a single mock
 * example. Instances are created by MockSDK.onRequest().
 */
export class MockSDKRequest {
  readonly sdk: MockSDK;
  readonly conditions: IRequestConditions;

  /**
   * Creates a request builder bound to the given SDK. Prefer creating instances
   * via MockSDK.onRequest().
   */
  constructor(sdk: MockSDK, conditions: IRequestConditions) {
    this.sdk = sdk;
    this.conditions = { ...conditions };
  }

  /**
   * Adds header match conditions. Returns this builder for chaining.
   */
  withHeaders(headers: HeaderRecord): this {
    const newConditions = Object.fromEntries(
      Object.entries(headers).map(([key, value]) => [
        MockSDK.toConditionKey('header', key),
        Array.isArray(value) ? value.join(', ') : value,
      ])
    );
    Object.assign(this.conditions, newConditions);
    return this;
  }

  /**
   * Adds query parameter match conditions. Returns this builder for chaining.
   */
  withSearchParams(params: URLSearchParamsInit): this {
    const searchParams = this.normalizeURLSearchParams(params);
    const newConditions = Object.fromEntries(
      Array.from(searchParams.keys()).map((key) => [
        MockSDK.toConditionKey('query', key),
        searchParams.getAll(key).join(','),
      ])
    );
    Object.assign(this.conditions, newConditions);
    return this;
  }

  /**
   * Normalizes any accepted URLSearchParamsInit form into a URLSearchParams.
   */
  private normalizeURLSearchParams(params: URLSearchParamsInit): URLSearchParams {
    if (params instanceof URLSearchParams) {
      return params;
    }

    if (typeof params === 'string') {
      return new URLSearchParams(params);
    }

    if (Array.isArray(params)) {
      return new URLSearchParams(params);
    }

    if (Symbol.iterator in Object(params)) {
      return new URLSearchParams(Array.from(params as Iterable<[string, string]>));
    }

    const record = params as Record<string, string | readonly string[]>;
    const entries: [string, string][] = [];
    for (const [key, val] of Object.entries(record)) {
      if (Array.isArray(val)) {
        for (const v of val) {
          entries.push([key, v]);
        }
      } else {
        entries.push([key, val as string]);
      }
    }
    return new URLSearchParams(entries);
  }

  /**
   * Adds cookie match conditions. Returns this builder for chaining.
   */
  withCookies(cookies: CookieRecord): this {
    const newConditions = Object.fromEntries(
      Object.entries(cookies).map(([key, value]) => [MockSDK.toConditionKey('cookie', key), value])
    );
    Object.assign(this.conditions, newConditions);
    return this;
  }

  /**
   * Registers the mock example with the accumulated conditions and returns its ID.
   */
  async respondWith(responseData: IResponseData): Promise<string> {
    return this.sdk.setExample(this.conditions, responseData);
  }

  /**
   * Registers a mock example that the server returns only once, then discards.
   * Returns the example ID.
   */
  async respondWithOnce(responseData: IResponseData): Promise<string> {
    return this.sdk.setExample(this.conditions, { ...responseData, once: true });
  }
}
