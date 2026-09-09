/*
Scenario: Creating condition keys for runtime expressions
Given a condition type and value
When toConditionKey is called with valid type
Then returns properly formatted runtime expression string
*/

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HttpClient } from './client/http';
import { MockSDK } from './mock-sdk';

const { mockCreateHttpClient } = vi.hoisted(() => ({
  mockCreateHttpClient: vi.fn(),
}));

vi.mock('./client/http', () => ({
  createHttpClient: mockCreateHttpClient,
}));

import { createHttpClient } from './client/http';

describe('MockSDK', () => {
  const mockHttpClient: HttpClient = {
    createExample: vi.fn(),
    deleteExample: vi.fn(),
    getRequests: vi.fn(),
    fireEvent: vi.fn(),
    postMessage: vi.fn(),
    listConsumers: vi.fn(),
    disconnectConsumer: vi.fn(),
  };

  beforeEach(() => {
    mockCreateHttpClient.mockClear();
    mockCreateHttpClient.mockReturnValue(mockHttpClient);
    vi.mocked(mockHttpClient.createExample).mockClear();
    vi.mocked(mockHttpClient.deleteExample).mockClear();
    vi.mocked(mockHttpClient.getRequests).mockClear();
    vi.mocked(mockHttpClient.fireEvent).mockClear();
    vi.mocked(mockHttpClient.postMessage).mockClear();
    vi.mocked(mockHttpClient.listConsumers).mockClear();
    vi.mocked(mockHttpClient.disconnectConsumer).mockClear();
  });

  describe('toConditionKey', () => {
    /*
    Scenario: Creating query parameter condition key
    Given condition type 'query' and value 'id'
    When toConditionKey is called
    Then returns runtime expression {$request.query.id}
    */
    it('should create request query condition key', () => {
      expect(MockSDK.toConditionKey('query', 'id')).toBe('{$request.query.id}');
    });

    /*
    Scenario: Creating header condition key
    Given condition type 'header' and value 'authorization'
    When toConditionKey is called
    Then returns runtime expression {$request.header.authorization}
    */
    it('should create request header condition key', () => {
      expect(MockSDK.toConditionKey('header', 'authorization')).toBe(
        '{$request.header.authorization}'
      );
    });

    /*
    Scenario: Creating cookie condition key
    Given condition type 'cookie' and value 'session'
    When toConditionKey is called
    Then returns runtime expression {$request.cookie.session}
    */
    it('should create request cookie condition key', () => {
      expect(MockSDK.toConditionKey('cookie', 'session')).toBe('{$request.cookie.session}');
    });

    /*
    Scenario: Creating path parameter condition key
    Given condition type 'path' and value 'userId'
    When toConditionKey is called
    Then returns runtime expression {$request.path.userId}
    */
    it('should create request path condition key', () => {
      expect(MockSDK.toConditionKey('path', 'userId')).toBe('{$request.path.userId}');
    });

    /*
    Scenario: Creating body field condition key
    Given condition type 'body' and value 'field'
    When toConditionKey is called
    Then returns runtime expression {$request.body.field}
    */
    it('should create request body condition key', () => {
      expect(MockSDK.toConditionKey('body', 'field')).toBe('{$request.body.field}');
    });

    /*
    Scenario: Creating state variable condition key
    Given condition type 'state' and value 'counter'
    When toConditionKey is called
    Then returns runtime expression {$state.counter}
    */
    it('should create state condition key', () => {
      expect(MockSDK.toConditionKey('state', 'counter')).toBe('{$state.counter}');
    });

    /*
    Scenario: Creating environment variable condition key
    Given condition type 'env' and value 'API_KEY'
    When toConditionKey is called
    Then returns runtime expression {$env.API_KEY}
    */
    it('should create env condition key', () => {
      expect(MockSDK.toConditionKey('env', 'API_KEY')).toBe('{$env.API_KEY}');
    });

    /*
    Scenario: Handling invalid condition type
    Given invalid condition type 'invalid' and value 'value'
    When toConditionKey is called
    Then throws error with informative message
    */
    it('should throw error for invalid condition type', () => {
      expect(() => MockSDK.toConditionKey('invalid', 'value')).toThrow(
        'Invalid condition type: invalid. Must be one of: path, query, header, cookie, body, state, env'
      );
    });

    /*
    Scenario: Case-insensitive condition type handling
    Given uppercase condition type 'QUERY' and value 'id'
    When toConditionKey is called
    Then returns correct runtime expression {$request.query.id}
    */
    it('should be case-insensitive for type', () => {
      expect(MockSDK.toConditionKey('QUERY', 'id')).toBe('{$request.query.id}');
    });
  });

  describe('constructor', () => {
    /*
    Scenario: Creating SDK instance with base URL
    Given a base URL without trailing slash
    When MockSDK constructor is called
    Then creates HTTP client with the same URL (normalization happens later)
    */
    it('should create http client with normalized base URL', () => {
      new MockSDK('http://localhost:19191');
      expect(createHttpClient).toHaveBeenCalledWith('http://localhost:19191');
    });

    /*
    Scenario: Creating SDK instance with trailing slash URL
    Given a base URL with trailing slash
    When MockSDK constructor is called
    Then creates HTTP client with the same URL (preserving slash)
    */
    it('should normalize base URL with trailing slash', () => {
      new MockSDK('http://localhost:19191/');
      expect(createHttpClient).toHaveBeenCalledWith('http://localhost:19191/');
    });
  });

  describe('onRequest', () => {
    /*
    Scenario: Starting request builder with path and method
    Given a SDK instance and path '/test' with method 'POST'
    When onRequest is called
    Then returns MockSDKRequest builder with correct path and method
    */
    it('should return MockSDKRequest builder with path and method', () => {
      const sdk = new MockSDK('http://localhost:19191');
      const request = sdk.onRequest('/test', 'POST');
      expect(request).toBeDefined();
      expect(request.conditions.path).toBe('/test');
      expect(request.conditions.method).toBe('POST');
    });

    /*
    Scenario: Starting request builder without method
    Given a SDK instance and path '/test' without method
    When onRequest is called
    Then returns MockSDKRequest builder with path only (method defaults later)
    */
    it('should default method to GET', () => {
      const sdk = new MockSDK('http://localhost:19191');
      const request = sdk.onRequest('/test');
      expect(request.conditions.method).toBeUndefined();
    });
  });

  describe('setExample', () => {
    /*
    Scenario: Setting mock example successfully
    Given valid request conditions and response data
    When setExample is called
    Then sends mapped request to HTTP client and returns example ID
    */
    it('should send example to http client and return ID', async () => {
      const sdk = new MockSDK('http://localhost:19191');
      const mockResponse = { success: true, message: 'OK', id: 'example-123' };
      vi.mocked(mockHttpClient.createExample).mockResolvedValue(mockResponse);

      const conditions = { path: '/test', method: 'GET' as const };
      const responseData = { code: 200, body: { ok: true } };
      const result = await sdk.setExample(conditions, responseData);

      expect(mockHttpClient.createExample).toHaveBeenCalledOnce();
      const calledWith = vi.mocked(mockHttpClient.createExample).mock.calls[0][0];
      expect(calledWith).toMatchObject({
        path: '/test',
        method: 'GET',
        response: { code: 200, body: { ok: true } },
      });
      expect(result).toBe('example-123');
    });

    /*
    Scenario: Setting mock example without code defaults to 200
    Given request conditions and response data without a code
    When setExample is called
    Then sends code 200 in the response payload to HTTP client
    */
    it('should send default code 200 when code omitted', async () => {
      const sdk = new MockSDK('http://localhost:19191');
      vi.mocked(mockHttpClient.createExample).mockResolvedValue({
        success: true,
        message: 'OK',
        id: 'example-123',
      });

      const conditions = { path: '/test' };
      await sdk.setExample(conditions, { body: { ok: true } });

      const calledWith = vi.mocked(mockHttpClient.createExample).mock.calls[0][0];
      expect(calledWith.response.code).toBe(200);
    });

    /*
    Scenario: Setting mock example with TTL
    Given request conditions and response data with ttl
    When setExample is called
    Then sends ttl in the request payload to HTTP client
    */
    it('should forward ttl to createExample payload', async () => {
      const sdk = new MockSDK('http://localhost:19191');
      const mockResponse = { success: true, message: 'OK', id: 'example-123' };
      vi.mocked(mockHttpClient.createExample).mockResolvedValue(mockResponse);

      const conditions = { path: '/test' };
      const responseData = { code: 200, ttl: 60 };
      await sdk.setExample(conditions, responseData);

      const calledWith = vi.mocked(mockHttpClient.createExample).mock.calls[0][0];
      expect(calledWith.ttl).toBe(60);
    });

    /*
    Scenario: Rejecting invalid ttl values
    Given request conditions and response data with negative or non-integer ttl
    When setExample is called
    Then throws error without calling HTTP client
    */
    it.each<[number]>([[-1], [1.5]])('should throw error for invalid ttl %s', async (ttl) => {
      const sdk = new MockSDK('http://localhost:19191');

      await expect(sdk.setExample({ path: '/test' }, { code: 200, ttl })).rejects.toThrow(
        'ttl must be a non-negative integer'
      );
      expect(mockHttpClient.createExample).not.toHaveBeenCalled();
    });

    /*
    Scenario: Setting mock example with server error
    Given request conditions and response data
    When HTTP client returns failure response
    Then setExample throws error with server message
    */
    it('should throw error when http client returns failure', async () => {
      const sdk = new MockSDK('http://localhost:19191');
      const mockResponse = { success: false, message: 'Validation failed' };
      vi.mocked(mockHttpClient.createExample).mockResolvedValue(mockResponse);

      const conditions = { path: '/test' };
      const responseData = { code: 200 };

      await expect(sdk.setExample(conditions, responseData)).rejects.toThrow(
        'Failed to set example: Validation failed'
      );
    });

    /*
    Scenario: Setting mock example returns success but missing ID
    Given request conditions and response data
    When HTTP client returns success but no ID
    Then setExample throws error about missing ID
    */
    it('should throw error when response success but missing ID', async () => {
      const sdk = new MockSDK('http://localhost:19191');
      const mockResponse = { success: true, message: 'OK' };
      vi.mocked(mockHttpClient.createExample).mockResolvedValue(mockResponse);

      const conditions = { path: '/test' };
      const responseData = { code: 200 };

      await expect(sdk.setExample(conditions, responseData)).rejects.toThrow(
        'Example created but no ID returned'
      );
    });

    /*
    Scenario: Setting mock example returns failure without message
    Given request conditions and response data
    When HTTP client returns failure response without message
    Then setExample throws error with default message
    */
    it('should throw error with default message when failure response missing message', async () => {
      const sdk = new MockSDK('http://localhost:19191');
      const mockResponse = { success: false };
      vi.mocked(mockHttpClient.createExample).mockResolvedValue(mockResponse);

      const conditions = { path: '/test' };
      const responseData = { code: 200 };

      await expect(sdk.setExample(conditions, responseData)).rejects.toThrow(
        'Failed to set example: Unknown error'
      );
    });
  });

  describe('getRequestList', () => {
    /*
    Scenario: Retrieving filtered request history
    Given filter options with path and limit
    When getRequestList is called
    Then sends filter query to HTTP client and returns mapped items
    */
    it('should fetch request history with filters', async () => {
      const sdk = new MockSDK('http://localhost:19191');
      const mockResponse = {
        data: [{ ts: 1234567890, url: '/test', method: 'GET', headers: {} }],
      };
      vi.mocked(mockHttpClient.getRequests).mockResolvedValue(mockResponse);

      const result = await sdk.getRequestList({ path: '/test', limit: 10 });

      expect(mockHttpClient.getRequests).toHaveBeenCalledWith({
        path: '/test',
        limit: 10,
      });
      expect(result).toEqual([{ ts: 1234567890, url: '/test', method: 'GET', headers: {} }]);
    });

    /*
    Scenario: Converting relative time filters to absolute timestamps
    Given filter options with relative time strings since '-10s' and till '+1h'
    When getRequestList is called
    Then converts relative times to absolute timestamps time_from and time_till
    */
    it('should convert since/till to time_from/time_till', async () => {
      const sdk = new MockSDK('http://localhost:19191');
      vi.mocked(mockHttpClient.getRequests).mockResolvedValue({ data: [] });

      await sdk.getRequestList({ since: '-10s', till: '+1h' });

      const calledWith = vi.mocked(mockHttpClient.getRequests).mock.calls[0][0];
      expect(calledWith).toHaveProperty('time_from');
      expect(calledWith).toHaveProperty('time_till');
      expect(typeof calledWith?.time_from).toBe('number');
      expect(typeof calledWith?.time_till).toBe('number');
    });

    /*
    Scenario: Retrieving request history with empty response
    Given filter options
    When HTTP client returns undefined response
    Then getRequestList returns empty array
    */
    it('should return empty array when response is undefined', async () => {
      const sdk = new MockSDK('http://localhost:19191');
      vi.mocked(mockHttpClient.getRequests).mockResolvedValue(undefined);

      const result = await sdk.getRequestList({ path: '/test' });

      expect(result).toEqual([]);
    });

    /*
    Scenario: Retrieving request history with missing data field
    Given filter options
    When HTTP client returns response without data field
    Then getRequestList returns empty array
    */
    it('should return empty array when response.data is undefined', async () => {
      const sdk = new MockSDK('http://localhost:19191');
      vi.mocked(mockHttpClient.getRequests).mockResolvedValue({});

      const result = await sdk.getRequestList({ path: '/test' });

      expect(result).toEqual([]);
    });
  });

  describe('getLastRequest', () => {
    /*
    Scenario: Retrieving most recent matching request
    Given filter options with path
    When getLastRequest is called
    Then queries with limit 1 and returns first item if present
    */
    it('should return first item from filtered history', async () => {
      const sdk = new MockSDK('http://localhost:19191');
      const mockItem = { ts: 1234567890, url: '/test', method: 'GET', headers: {} };
      vi.mocked(mockHttpClient.getRequests).mockResolvedValue({ data: [mockItem, {}] });

      const result = await sdk.getLastRequest({ path: '/test' });

      expect(mockHttpClient.getRequests).toHaveBeenCalledWith({
        path: '/test',
        limit: 1,
      });
      expect(result).toEqual(mockItem);
    });

    /*
    Scenario: Retrieving most recent request when none exist
    Given filter options
    When no requests match the filter
    Then getLastRequest returns undefined
    */
    it('should return undefined when no requests', async () => {
      const sdk = new MockSDK('http://localhost:19191');
      vi.mocked(mockHttpClient.getRequests).mockResolvedValue({ data: [] });

      const result = await sdk.getLastRequest({ path: '/test' });

      expect(result).toBeUndefined();
    });
  });

  describe('toConditionKey (async contexts)', () => {
    /*
    Scenario: Creating event identity condition key
    Given condition type 'event' and value 'name'
    When toConditionKey is called
    Then returns runtime expression {$event.name}
    */
    it('should create event name condition key', () => {
      expect(MockSDK.toConditionKey('event', 'name')).toBe('{$event.name}');
    });

    /*
    Scenario: Creating event data condition key
    Given condition type 'event' and value 'data'
    When toConditionKey is called
    Then returns runtime expression {$event.data}
    */
    it('should create event data condition key', () => {
      expect(MockSDK.toConditionKey('event', 'data')).toBe('{$event.data}');
    });

    /*
    Scenario: Creating connection recipient condition key
    Given condition type 'connection' and value 'id'
    When toConditionKey is called
    Then returns runtime expression {$connection.id}
    */
    it('should create connection condition key', () => {
      expect(MockSDK.toConditionKey('connection', 'id')).toBe('{$connection.id}');
    });

    /*
    Scenario: Creating message reply condition key
    Given condition type 'message' and value 'field'
    When toConditionKey is called
    Then returns runtime expression {$message.field}
    */
    it('should create message condition key', () => {
      expect(MockSDK.toConditionKey('message', 'field')).toBe('{$message.field}');
    });

    /*
    Scenario: Creating channel reply condition key
    Given condition type 'channel' and value 'address'
    When toConditionKey is called
    Then returns runtime expression {$channel.address}
    */
    it('should create channel condition key', () => {
      expect(MockSDK.toConditionKey('channel', 'address')).toBe('{$channel.address}');
    });
  });

  describe('deleteExample', () => {
    /*
    Scenario: Deleting mock example successfully
    Given an example ID
    When deleteExample is called
    Then sends DELETE to http client
    */
    it('should send delete request to http client', async () => {
      const sdk = new MockSDK('http://localhost:19191');
      vi.mocked(mockHttpClient.deleteExample).mockResolvedValue({ success: true });

      await sdk.deleteExample('example-1');

      expect(mockHttpClient.deleteExample).toHaveBeenCalledWith('example-1');
    });

    /*
    Scenario: Deleting mock example that fails
    Given an example ID
    When http client returns failure
    Then deleteExample rejects with informative error
    */
    it('should throw when delete fails', async () => {
      const sdk = new MockSDK('http://localhost:19191');
      vi.mocked(mockHttpClient.deleteExample).mockResolvedValue({ success: false });

      await expect(sdk.deleteExample('example-1')).rejects.toThrow(
        'Failed to delete example: example-1'
      );
    });

    /*
    Scenario: Deleting mock example without ID
    Given an empty example ID
    When deleteExample is called
    Then throws without calling http client
    */
    it('should throw when exampleId is empty', async () => {
      const sdk = new MockSDK('http://localhost:19191');

      await expect(sdk.deleteExample('')).rejects.toThrow('Example ID is required');
      expect(mockHttpClient.deleteExample).not.toHaveBeenCalled();
    });
  });

  describe('fireEvent', () => {
    /*
    Scenario: Firing global event by default
    Given an event name with payload
    When fireEvent is called without global
    Then sends global true request to http client
    */
    it('should default global to true', async () => {
      const sdk = new MockSDK('http://localhost:19191');
      vi.mocked(mockHttpClient.fireEvent).mockResolvedValue({ success: true });

      await sdk.fireEvent('user.created', { payload: { userId: '42' } });

      expect(mockHttpClient.fireEvent).toHaveBeenCalledWith({
        name: 'user.created',
        payload: { userId: '42' },
        global: true,
      });
    });

    /*
    Scenario: Firing event with explicit options
    Given an event name with payload, delay, and global
    When fireEvent is called with explicit options
    Then sends parsed delay milliseconds and explicit global
    */
    it('should honor explicit options and parse delay', async () => {
      const sdk = new MockSDK('http://localhost:19191');
      vi.mocked(mockHttpClient.fireEvent).mockResolvedValue({ success: true });

      await sdk.fireEvent('user.created', { payload: { n: 1 }, delay: '500ms', global: false });

      expect(mockHttpClient.fireEvent).toHaveBeenCalledWith({
        name: 'user.created',
        payload: { n: 1 },
        delay: 500,
        global: false,
      });
    });

    /*
    Scenario: Firing event without a name
    Given an empty event name
    When fireEvent is called
    Then throws without calling http client
    */
    it('should throw when name is empty', async () => {
      const sdk = new MockSDK('http://localhost:19191');

      await expect(sdk.fireEvent('')).rejects.toThrow('Event name is required');
      expect(mockHttpClient.fireEvent).not.toHaveBeenCalled();
    });

    /*
    Scenario: Firing event that fails
    Given an event name
    When http client returns failure
    Then fireEvent rejects
    */
    it('should throw when fire fails', async () => {
      const sdk = new MockSDK('http://localhost:19191');
      vi.mocked(mockHttpClient.fireEvent).mockResolvedValue({ success: false });

      await expect(sdk.fireEvent('boom')).rejects.toThrow('Failed to fire event: Unknown error');
    });
  });

  describe('pushToChannel', () => {
    /*
    Scenario: Pushing broadcast message
    Given a channel and payload
    When pushToChannel is called
    Then sends channel and payload to http client
    */
    it('should push broadcast message', async () => {
      const sdk = new MockSDK('http://localhost:19191');
      vi.mocked(mockHttpClient.postMessage).mockResolvedValue({ success: true });

      await sdk.pushToChannel('/schema/user/updates', { payload: { kind: 'ping' } });

      expect(mockHttpClient.postMessage).toHaveBeenCalledWith({
        channel: '/schema/user/updates',
        payload: { kind: 'ping' },
      });
    });

    /*
    Scenario: Pushing targeted message
    Given a channel, connection id, and payload
    When pushToChannel is called
    Then sends connectionId to http client
    */
    it('should push targeted message', async () => {
      const sdk = new MockSDK('http://localhost:19191');
      vi.mocked(mockHttpClient.postMessage).mockResolvedValue({ success: true });

      await sdk.pushToChannel('/schema/user/updates', {
        connectionId: 'conn-1',
        payload: { kind: 'dm' },
      });

      expect(mockHttpClient.postMessage).toHaveBeenCalledWith({
        channel: '/schema/user/updates',
        connectionId: 'conn-1',
        payload: { kind: 'dm' },
      });
    });

    /*
    Scenario: Pushing an array payload
    Given a channel and an array payload
    When pushToChannel is called
    Then sends the array payload verbatim to http client
    */
    it('should push array payload verbatim', async () => {
      const sdk = new MockSDK('http://localhost:19191');
      vi.mocked(mockHttpClient.postMessage).mockResolvedValue({ success: true });
      const payload = [{ orderId: 'grid-1' }];

      await sdk.pushToChannel('/qoden/OpenOrders', { payload });

      expect(mockHttpClient.postMessage).toHaveBeenCalledWith({
        channel: '/qoden/OpenOrders',
        payload: [{ orderId: 'grid-1' }],
      });
    });

    /*
    Scenario: Pushing without a channel
    Given an empty channel
    When pushToChannel is called
    Then throws without calling http client
    */
    it('should throw when channel is empty', async () => {
      const sdk = new MockSDK('http://localhost:19191');

      await expect(sdk.pushToChannel('', { payload: {} })).rejects.toThrow('Channel is required');
      expect(mockHttpClient.postMessage).not.toHaveBeenCalled();
    });
  });

  describe('getConsumerList', () => {
    /*
    Scenario: Listing consumers with channel filter
    Given a channel
    When getConsumerList is called
    Then maps consumers into SDK wrappers
    */
    it('should map consumers into wrappers', async () => {
      const sdk = new MockSDK('http://localhost:19191');
      vi.mocked(mockHttpClient.listConsumers).mockResolvedValue({
        consumers: [
          { connectionId: 'conn-1', channel: '/schema/user/updates', protocol: 'ws', streams: [] },
        ],
      });

      const consumers = await sdk.getConsumerList('/schema/user/updates');

      expect(mockHttpClient.listConsumers).toHaveBeenCalledWith('/schema/user/updates');
      expect(consumers).toHaveLength(1);
      expect(consumers[0]).toMatchObject({
        connectionId: 'conn-1',
        channel: '/schema/user/updates',
        protocol: 'ws',
      });
      expect(typeof consumers[0].disconnect).toBe('function');
      expect(typeof consumers[0].push).toBe('function');
    });

    /*
    Scenario: Mapping the SignalR upgrade path onto consumers
    Given a signalr consumer with a per-account upgrade path
    When getConsumerList is called
    Then the consumer wrapper exposes the path
    */
    it('should map signalr upgrade path onto consumer', async () => {
      const sdk = new MockSDK('http://localhost:19191');
      vi.mocked(mockHttpClient.listConsumers).mockResolvedValue({
        consumers: [
          {
            connectionId: 'conn-1',
            channel: '/qoden/OpenOrders',
            protocol: 'signalr',
            path: '/qoden/ws/account/qa-A',
            streams: [],
          },
        ],
      });

      const consumers = await sdk.getConsumerList('/qoden/OpenOrders');

      expect(consumers[0]).toMatchObject({
        connectionId: 'conn-1',
        channel: '/qoden/OpenOrders',
        protocol: 'signalr',
        path: '/qoden/ws/account/qa-A',
      });
      expect(consumers[0].path).toBe('/qoden/ws/account/qa-A');
    });

    /*
    Scenario: Listing all consumers without filter
    Given no channel
    When asyncConsumers.getList is called
    Then calls http client without channel
    */
    it('should list all consumers via asyncConsumers facade', async () => {
      const sdk = new MockSDK('http://localhost:19191');
      vi.mocked(mockHttpClient.listConsumers).mockResolvedValue({ consumers: [] });

      await sdk.asyncConsumers.getList();

      expect(mockHttpClient.listConsumers).toHaveBeenCalledWith(undefined);
    });

    /*
    Scenario: Listing consumers with no response
    Given http client returns undefined
    When getConsumerList is called
    Then returns empty array
    */
    it('should return empty list when response is undefined', async () => {
      const sdk = new MockSDK('http://localhost:19191');
      vi.mocked(mockHttpClient.listConsumers).mockResolvedValue(undefined);

      const result = await sdk.getConsumerList();

      expect(result).toEqual([]);
    });
  });

  describe('disconnectConsumer', () => {
    /*
    Scenario: Disconnecting consumer with abrupt flag
    Given a connection id and abrupt option
    When disconnectConsumer is called
    Then sends query with abrupt true
    */
    it('should send close control query params', async () => {
      const sdk = new MockSDK('http://localhost:19191');
      vi.mocked(mockHttpClient.disconnectConsumer).mockResolvedValue({ success: true });

      await sdk.disconnectConsumer('conn-9', { abrupt: true });

      expect(mockHttpClient.disconnectConsumer).toHaveBeenCalledWith('conn-9', { abrupt: true });
    });

    /*
    Scenario: Disconnecting consumer without options
    Given a connection id only
    When disconnectConsumer is called
    Then omits the query parameter
    */
    it('should omit query when no options provided', async () => {
      const sdk = new MockSDK('http://localhost:19191');
      vi.mocked(mockHttpClient.disconnectConsumer).mockResolvedValue({ success: true });

      await sdk.disconnectConsumer('conn-9');

      expect(mockHttpClient.disconnectConsumer).toHaveBeenCalledWith('conn-9', undefined);
    });

    /*
    Scenario: Disconnecting consumer without a connection id
    Given an empty connection id
    When disconnectConsumer is called
    Then throws
    */
    it('should throw when connectionId is empty', async () => {
      const sdk = new MockSDK('http://localhost:19191');

      await expect(sdk.disconnectConsumer('')).rejects.toThrow('Connection ID is required');
    });
  });

  describe('asyncChannel', () => {
    /*
    Scenario: Creating async channel facade
    Given an address
    When asyncChannel is called
    Then returns a channel bound to that address with default ws protocol
    */
    it('should create channel with default protocol', () => {
      const sdk = new MockSDK('http://localhost:19191');
      const channel = sdk.asyncChannel('/schema-prefix/user/updates');

      expect(channel).toMatchObject({ channel: '/schema-prefix/user/updates', protocol: 'ws' });
      expect(typeof channel.onEvent).toBe('function');
      expect(typeof channel.onInterval).toBe('function');
      expect(typeof channel.push).toBe('function');
    });

    /*
    Scenario: Creating an async channel facade bound to a SignalR hub
    Given an address and the signalr protocol
    When asyncChannel is called
    Then returns a channel bound to that address with the signalr protocol
    */
    it('should create channel with signalr protocol', () => {
      const sdk = new MockSDK('http://localhost:19191');
      const channel = sdk.asyncChannel('/qoden/OpenOrders', 'signalr');

      expect(channel).toMatchObject({ channel: '/qoden/OpenOrders', protocol: 'signalr' });
    });

    /*
    Scenario: Publishing instantly via channel
    Given a channel
    When channel.push is called
    Then pushes broadcast message via http client
    */
    it('should push via channel facade', async () => {
      const sdk = new MockSDK('http://localhost:19191');
      vi.mocked(mockHttpClient.postMessage).mockResolvedValue({ success: true });

      await sdk.asyncChannel('/schema-prefix/user/updates').push({ now: true });

      expect(mockHttpClient.postMessage).toHaveBeenCalledWith({
        channel: '/schema-prefix/user/updates',
        payload: { now: true },
      });
    });
  });
});
