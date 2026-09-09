import type { RequestHistoryItem as GeneratedRequestHistoryItem } from './client/generated/types.gen';
import type { HttpClient } from './client/http';
import { createHttpClient, normalizeBaseUrl } from './client/http';
import {
  CONDITION_KEY_PREFIXES,
  type ConditionType,
  DEFAULT_ASYNC_PROTOCOL,
  PREFIXED_CONDITION_TYPES,
  VALID_CONDITION_TYPES,
} from './constants';
import { parseDurationToMs } from './internal/duration';
import {
  type IAsyncExampleRequestParams,
  mapAsyncExampleToRequest,
  mapConditionsToAddExampleRequest,
  mapHistoryOptionsToGetRequestsData,
} from './internal/mappers';
import { MockSDKAsyncChannel } from './mock-sdk-async-channel';
import { MockSDKConsumer } from './mock-sdk-consumer';
import { MockSDKRequest } from './mock-sdk-request';
import { ManagementStream } from './mock-sdk-stream';
import type {
  IAsyncChannel,
  IConsumer,
  IConsumerEnvelope,
  IDisconnectOptions,
  IEventEnvelope,
  IFireEventOptions,
  IGetRequestHistoryOptions,
  IMockSDKOptions,
  IPushEnvelope,
  IPushMessageOptions,
  IRequestConditions,
  IRequestHistoryItem,
  IResponseData,
  IScheduleEnvelope,
  TAsyncProtocol,
  TMethod,
  TStreamHostType,
  TWebSocketFactory,
  Unsubscribe,
  WebSocketLike,
} from './types';

const PREFIXED_CONDITION_KEY = new Set<string>(PREFIXED_CONDITION_TYPES);

/**
 * Throws if the given TTL is defined but is not a non-negative integer.
 */
function assertValidTtl(ttl: number | undefined): void {
  if (ttl !== undefined && (!Number.isInteger(ttl) || ttl < 0)) {
    throw new Error('ttl must be a non-negative integer');
  }
}

/**
 * Builds the management-stream WebSocket URL from a base URL.
 */
function buildStreamUrl(baseUrl: string): string {
  return `${normalizeBaseUrl(baseUrl).replace(/^http/, 'ws')}/stream`;
}

/**
 * Default WebSocket factory: uses the global WebSocket (browser/Node 22+).
 */
function defaultWsFactory(url: string): WebSocketLike {
  if (typeof WebSocket === 'undefined') {
    throw new Error('WebSocket is not available; provide a wsFactory option to MockSDK');
  }
  return new WebSocket(url) as WebSocketLike;
}

/**
 * Entry point of the SDK: talks to an OASMock server over its HTTP control API
 * and lets you register mock examples, inspect request history, drive async
 * (AsyncAPI) targets, and subscribe to the management stream.
 */
export class MockSDK {
  private readonly client: HttpClient;
  private readonly baseUrl: string;
  private readonly wsFactory: TWebSocketFactory;
  private stream?: ManagementStream;

  /**
   * Creates a client bound to the OASMock server at `baseUrl`.
   */
  constructor(baseUrl: string, options?: IMockSDKOptions) {
    this.client = createHttpClient(baseUrl);
    this.baseUrl = baseUrl;
    this.wsFactory = options?.wsFactory ?? defaultWsFactory;
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
   * Binds to an AsyncAPI channel (address includes the schema prefix).
   */
  asyncChannel(address: string, protocol: TAsyncProtocol = DEFAULT_ASYNC_PROTOCOL): IAsyncChannel {
    return new MockSDKAsyncChannel(this, address, protocol);
  }

  /**
   * Facade for querying and disconnecting connected consumers across channels.
   */
  readonly asyncConsumers: {
    getList: () => Promise<IConsumer[]>;
    disconnect: (connectionId: string, options?: IDisconnectOptions) => Promise<void>;
  } = {
    getList: () => this.getConsumerList(),
    disconnect: (connectionId, options) => this.disconnectConsumer(connectionId, options),
  };

  /**
   * Registers a mock example for the given request conditions and response data.
   * Returns the unique ID of the created example.
   */
  async setExample(conditions: IRequestConditions, responseData: IResponseData): Promise<string> {
    assertValidTtl(responseData.ttl);
    return this.addExample(mapConditionsToAddExampleRequest(conditions, responseData));
  }

  /**
   * Registers an async (AsyncAPI) example from builder parameters.
   */
  async addAsyncExample(params: IAsyncExampleRequestParams): Promise<string> {
    return this.addExample(mapAsyncExampleToRequest(params));
  }

  /**
   * Removes a dynamic example, cancelling any recurring delivery.
   */
  async deleteExample(exampleId: string): Promise<void> {
    if (!exampleId) {
      throw new Error('Example ID is required');
    }
    const response = await this.client.deleteExample(exampleId);
    if (!response?.success) {
      throw new Error(`Failed to delete example: ${exampleId}`);
    }
  }

  /**
   * Fires a named event, broadcasting it over all loaded schemas by default.
   */
  async fireEvent(name: string, options: IFireEventOptions = {}): Promise<void> {
    if (!name) {
      throw new Error('Event name is required');
    }
    const response = await this.client.fireEvent({
      name,
      ...(options.payload !== undefined ? { payload: options.payload } : {}),
      ...(options.delay !== undefined ? { delay: parseDurationToMs(options.delay) } : {}),
      ...(options.global !== undefined ? { global: options.global } : { global: true }),
    });
    if (!response?.success) {
      throw new Error(`Failed to fire event: ${response?.name ?? 'Unknown error'}`);
    }
  }

  /**
   * Pushes a message to channel consumers (targeted or broadcast).
   */
  async pushToChannel(channel: string, options: IPushMessageOptions = {}): Promise<void> {
    if (!channel) {
      throw new Error('Channel is required');
    }
    const response = await this.client.postMessage({
      channel,
      ...(options.connectionId !== undefined ? { connectionId: options.connectionId } : {}),
      ...(options.payload !== undefined
        ? { payload: options.payload as Parameters<HttpClient['postMessage']>[0]['payload'] }
        : {}),
      ...(options.delay !== undefined ? { delay: parseDurationToMs(options.delay) } : {}),
    });
    if (!response?.success) {
      throw new Error('Failed to push message');
    }
  }

  /**
   * Lists the currently connected consumers, optionally filtered by channel.
   */
  async getConsumerList(channel?: string): Promise<IConsumer[]> {
    const response = await this.client.listConsumers(channel);
    return (response?.consumers ?? []).map(
      (item) =>
        new MockSDKConsumer(
          this,
          item.connectionId ?? '',
          item.channel ?? '',
          item.protocol ?? 'ws',
          item.streams
        )
    );
  }

  /**
   * Force-disconnects a consumer, with optional close control.
   */
  async disconnectConsumer(connectionId: string, options: IDisconnectOptions = {}): Promise<void> {
    if (!connectionId) {
      throw new Error('Connection ID is required');
    }
    const query = {
      ...(options.code !== undefined ? { code: options.code } : {}),
      ...(options.reason !== undefined ? { reason: options.reason } : {}),
      ...(options.abrupt !== undefined ? { abrupt: options.abrupt } : {}),
    };
    const response = await this.client.disconnectConsumer(
      connectionId,
      Object.keys(query).length > 0 ? query : undefined
    );
    if (!response?.success) {
      throw new Error(`Failed to disconnect consumer: ${connectionId}`);
    }
  }

  /**
   * Subscribes to `event` envelopes by event name. Returns an unsubscribe fn.
   */
  on(event: string, handler: (envelope: IEventEnvelope) => void): Unsubscribe;
  /**
   * Subscribes to push/consumer/schedule envelopes. Returns an unsubscribe fn.
   */
  on(
    kind: TStreamHostType,
    handler: (envelope: IPushEnvelope | IConsumerEnvelope | IScheduleEnvelope) => void
  ): Unsubscribe;
  on(selector: string, handler: (envelope: never) => void): Unsubscribe {
    if (selector === 'push' || selector === 'consumer' || selector === 'schedule') {
      return this.getStream().onEnvelopeType(
        selector,
        handler as Parameters<ManagementStream['onEnvelopeType']>[1]
      );
    }
    return this.getStream().onEventName(
      selector,
      handler as Parameters<ManagementStream['onEventName']>[1]
    );
  }

  /**
   * Lazily creates the management stream (socket opens on first subscription).
   */
  private getStream(): ManagementStream {
    if (!this.stream) {
      this.stream = new ManagementStream(buildStreamUrl(this.baseUrl), this.wsFactory);
    }
    return this.stream;
  }

  /**
   * Shares the success/ID validation across sync and async example creation.
   */
  private async addExample(request: Parameters<HttpClient['createExample']>[0]): Promise<string> {
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
   * Builds a runtime-expression condition key (e.g. `{$request.query.foo}`,
   * `{$event.name}`) from a condition type and value. Throws for unsupported
   * condition types.
   */
  static toConditionKey(type: string, value: string): string {
    const normalizedType = type.toLowerCase();

    if (!VALID_CONDITION_TYPES.includes(normalizedType as ConditionType)) {
      throw new Error(
        `Invalid condition type: ${type}. Must be one of: ${VALID_CONDITION_TYPES.join(', ')}`
      );
    }

    if (PREFIXED_CONDITION_KEY.has(normalizedType)) {
      return `${CONDITION_KEY_PREFIXES[normalizedType.toUpperCase() as keyof typeof CONDITION_KEY_PREFIXES]}${value}}`;
    }

    return `${CONDITION_KEY_PREFIXES.REQUEST}${normalizedType}.${value}}`;
  }
}
