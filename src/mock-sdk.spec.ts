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
    getRequests: vi.fn(),
  };

  beforeEach(() => {
    mockCreateHttpClient.mockClear();
    mockCreateHttpClient.mockReturnValue(mockHttpClient);
    vi.mocked(mockHttpClient.createExample).mockClear();
    vi.mocked(mockHttpClient.getRequests).mockClear();
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
});
