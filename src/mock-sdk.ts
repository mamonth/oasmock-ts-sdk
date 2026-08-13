import type { RequestHistoryItem as GeneratedRequestHistoryItem } from './client/generated/types.gen';
import type { HttpClient } from './client/http';
import { createHttpClient } from './client/http';
import { CONDITION_KEY_PREFIXES, type ConditionType, VALID_CONDITION_TYPES } from './constants';
import {
  mapConditionsToAddExampleRequest,
  mapHistoryOptionsToGetRequestsData,
} from './internal/mappers';
import { MockSDKRequest } from './mock-sdk-request';
import type {
  IGetRequestHistoryOptions,
  IRequestConditions,
  IRequestHistoryItem,
  IResponseData,
  TMethod,
} from './types';

/**
 * Throws if the given TTL is defined but is not a non-negative integer.
 */
function assertValidTtl(ttl: number | undefined): void {
  if (ttl !== undefined && (!Number.isInteger(ttl) || ttl < 0)) {
    throw new Error('ttl must be a non-negative integer');
  }
}

/**
 * Entry point of the SDK: talks to an OASMock server over its HTTP control API
 * and lets you register mock examples and inspect request history.
 */
export class MockSDK {
  private readonly client: HttpClient;

  /**
   * Creates a client bound to the OASMock server at `baseUrl`.
   */
  constructor(baseUrl: string) {
    this.client = createHttpClient(baseUrl);
  }

  /**
   * Starts a new mock definition for the given path (and optionally method).
   * Chain `withHeaders`/`withSearchParams`/`withCookies` and finish it with
   * `respondWith` or `respondWithOnce`.
   */
  onRequest(path: string, method?: TMethod): MockSDKRequest {
    return new MockSDKRequest(this, { path, method });
  }

  /**
   * Registers a mock example for the given request conditions and response data.
   * Returns the unique ID of the created example.
   */
  async setExample(conditions: IRequestConditions, responseData: IResponseData): Promise<string> {
    assertValidTtl(responseData.ttl);
    const request = mapConditionsToAddExampleRequest(conditions, responseData);
    const response = await this.client.createExample(request);

    if (!response?.success) {
      throw new Error(`Failed to set example: ${response?.message ?? 'Unknown error'}`);
    }

    if (!response.id) {
      throw new Error('Example created but no ID returned');
    }

    return response.id;
  }

  /**
   * Fetches the history of requests received by the mock server, optionally
   * filtered by path, method, or time range.
   */
  async getRequestList(options?: IGetRequestHistoryOptions): Promise<IRequestHistoryItem[]> {
    const query = mapHistoryOptionsToGetRequestsData(options);
    const response = await this.client.getRequests(query);
    const items = response?.data ?? [];

    return items.map(
      (item: GeneratedRequestHistoryItem): IRequestHistoryItem => ({
        ts: item.ts ?? Date.now(),
        url: item.url ?? '',
        method: (item.method as TMethod) ?? 'GET',
        body: item.body,
        headers: (item.headers as Record<string, string | string[]>) ?? {},
      })
    );
  }

  /**
   * Returns the most recent request matching the given history options, if any.
   */
  async getLastRequest(
    options?: IGetRequestHistoryOptions
  ): Promise<IRequestHistoryItem | undefined> {
    const requests = await this.getRequestList({ ...options, limit: 1 });
    return requests[0];
  }

  /**
   * Builds a runtime-expression condition key (e.g. `{$request.query.foo}`) from a
   * condition type and value. Throws for unsupported condition types.
   */
  static toConditionKey(type: string, value: string): string {
    const normalizedType = type.toLowerCase();

    if (!VALID_CONDITION_TYPES.includes(normalizedType as ConditionType)) {
      throw new Error(
        `Invalid condition type: ${type}. Must be one of: ${VALID_CONDITION_TYPES.join(', ')}`
      );
    }

    if (normalizedType === 'state') {
      return `${CONDITION_KEY_PREFIXES.STATE}${value}}`;
    }

    if (normalizedType === 'env') {
      return `${CONDITION_KEY_PREFIXES.ENV}${value}}`;
    }

    return `${CONDITION_KEY_PREFIXES.REQUEST}${normalizedType}.${value}}`;
  }
}
