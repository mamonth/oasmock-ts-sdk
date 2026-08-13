/*
Scenario: Building mock request with fluent conditions
Given a MockSDKRequest builder
When chainable condition methods are called
Then conditions are accumulated and sent to server
*/

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockSDK } from './mock-sdk';
import { MockSDKRequest } from './mock-sdk-request';

describe('MockSDKRequest', () => {
  const mockSetExample = vi.fn();
  const mockSdk = {
    setExample: mockSetExample,
  } as unknown as MockSDK;

  beforeEach(() => {
    mockSetExample.mockClear();
  });

  describe('constructor', () => {
    /*
    Scenario: Creating request builder with initial conditions
    Given SDK instance and initial path/method conditions
    When MockSDKRequest is instantiated
    Then stores SDK reference and copies conditions
    */
    it('should store SDK reference and initial conditions', () => {
      const request = new MockSDKRequest(mockSdk, { path: '/test', method: 'POST' });
      expect(request.sdk).toBe(mockSdk);
      expect(request.conditions.path).toBe('/test');
      expect(request.conditions.method).toBe('POST');
    });
  });

  describe('withHeaders', () => {
    /*
    Scenario: Adding header conditions to request builder
    Given request builder and header record
    When withHeaders is called
    Then adds header runtime expressions to conditions
    */
    it('should add header conditions', () => {
      const request = new MockSDKRequest(mockSdk, { path: '/test' });
      request.withHeaders({ authorization: 'Bearer token', 'x-custom': 'value' });

      expect(request.conditions).toMatchObject({
        path: '/test',
        '{$request.header.authorization}': 'Bearer token',
        '{$request.header.x-custom}': 'value',
      });
    });

    /*
    Scenario: Adding array-valued headers
    Given request builder and header with array value
    When withHeaders is called
    Then joins array values with comma-space separator
    */
    it('should handle array header values', () => {
      const request = new MockSDKRequest(mockSdk, { path: '/test' });
      request.withHeaders({ accept: ['application/json', 'text/plain'] });

      expect(request.conditions['{$request.header.accept}']).toBe('application/json, text/plain');
    });

    /*
    Scenario: Chaining header condition methods
    Given request builder
    When withHeaders is called
    Then returns same instance for method chaining
    */
    it('should be chainable', () => {
      const request = new MockSDKRequest(mockSdk, { path: '/test' });
      const returned = request.withHeaders({ auth: 'token' });
      expect(returned).toBe(request);
    });
  });

  describe('withSearchParams', () => {
    /*
    Scenario: Adding query parameter conditions from Record
    Given request builder and query parameters as Record
    When withSearchParams is called
    Then adds query runtime expressions to conditions
    */
    it('should add query parameter conditions from Record', () => {
      const request = new MockSDKRequest(mockSdk, { path: '/test' });
      request.withSearchParams({ id: '123', filter: 'active' });

      expect(request.conditions).toMatchObject({
        path: '/test',
        '{$request.query.id}': '123',
        '{$request.query.filter}': 'active',
      });
    });

    /*
    Scenario: Adding query parameter conditions from URLSearchParams
    Given request builder and URLSearchParams instance
    When withSearchParams is called
    Then adds query runtime expressions to conditions
    */
    it('should add query parameter conditions from URLSearchParams', () => {
      const params = new URLSearchParams('id=123&filter=active');
      const request = new MockSDKRequest(mockSdk, { path: '/test' });
      request.withSearchParams(params);

      expect(request.conditions['{$request.query.id}']).toBe('123');
      expect(request.conditions['{$request.query.filter}']).toBe('active');
    });

    /*
    Scenario: Adding query parameters with array values
    Given request builder and query parameter with array value
    When withSearchParams is called
    Then joins array values with comma separator
    */
    it('should handle array values', () => {
      const request = new MockSDKRequest(mockSdk, { path: '/test' });
      request.withSearchParams({ tags: ['js', 'ts'] });

      expect(request.conditions['{$request.query.tags}']).toBe('js,ts');
    });

    /*
    Scenario: Adding query parameters from query string
    Given request builder and query string
    When withSearchParams is called
    Then parses string and adds query runtime expressions
    */
    it('should handle query string', () => {
      const request = new MockSDKRequest(mockSdk, { path: '/test' });
      request.withSearchParams('id=123&filter=active');

      expect(request.conditions['{$request.query.id}']).toBe('123');
      expect(request.conditions['{$request.query.filter}']).toBe('active');
    });

    /*
    Scenario: Adding query parameters from array of entries
    Given request builder and array of [key, value] pairs
    When withSearchParams is called
    Then adds query runtime expressions
    */
    it('should handle array of entries', () => {
      const request = new MockSDKRequest(mockSdk, { path: '/test' });
      request.withSearchParams([
        ['id', '123'],
        ['filter', 'active'],
      ]);

      expect(request.conditions['{$request.query.id}']).toBe('123');
      expect(request.conditions['{$request.query.filter}']).toBe('active');
    });

    /*
    Scenario: Adding query parameters from iterable (Map)
    Given request builder and Map instance
    When withSearchParams is called
    Then adds query runtime expressions
    */
    it('should handle iterable (Map)', () => {
      const request = new MockSDKRequest(mockSdk, { path: '/test' });
      const map = new Map([
        ['id', '123'],
        ['filter', 'active'],
      ]);
      request.withSearchParams(map);

      expect(request.conditions['{$request.query.id}']).toBe('123');
      expect(request.conditions['{$request.query.filter}']).toBe('active');
    });

    /*
    Scenario: Chaining query parameter condition methods
    Given request builder
    When withSearchParams is called
    Then returns same instance for method chaining
    */
    it('should be chainable', () => {
      const request = new MockSDKRequest(mockSdk, { path: '/test' });
      const returned = request.withSearchParams({ id: '123' });
      expect(returned).toBe(request);
    });
  });

  describe('withCookies', () => {
    /*
    Scenario: Adding cookie conditions to request builder
    Given request builder and cookie record
    When withCookies is called
    Then adds cookie runtime expressions to conditions
    */
    it('should add cookie conditions', () => {
      const request = new MockSDKRequest(mockSdk, { path: '/test' });
      request.withCookies({ session: 'abc123', uid: '42' });

      expect(request.conditions).toMatchObject({
        path: '/test',
        '{$request.cookie.session}': 'abc123',
        '{$request.cookie.uid}': '42',
      });
    });

    /*
    Scenario: Chaining cookie condition methods
    Given request builder
    When withCookies is called
    Then returns same instance for method chaining
    */
    it('should be chainable', () => {
      const request = new MockSDKRequest(mockSdk, { path: '/test' });
      const returned = request.withCookies({ session: 'abc' });
      expect(returned).toBe(request);
    });
  });

  describe('respondWith', () => {
    /*
    Scenario: Sending accumulated conditions to create example
    Given request builder with accumulated conditions
    When respondWith is called with response data
    Then calls SDK setExample with conditions and returns example ID
    */
    it('should call SDK setExample with accumulated conditions', async () => {
      const request = new MockSDKRequest(mockSdk, { path: '/test' })
        .withHeaders({ authorization: 'Bearer token' })
        .withSearchParams({ id: '123' });

      mockSetExample.mockResolvedValue('example-id');

      const responseData = { code: 201, body: { created: true } };
      const result = await request.respondWith(responseData);

      expect(mockSetExample).toHaveBeenCalledOnce();
      const [conditions, data] = mockSetExample.mock.calls[0];
      expect(conditions.path).toBe('/test');
      expect(conditions['{$request.header.authorization}']).toBe('Bearer token');
      expect(conditions['{$request.query.id}']).toBe('123');
      expect(data).toEqual(responseData);
      expect(result).toBe('example-id');
    });

    /*
    Scenario: Forwarding ttl through fluent builder
    Given request builder and response data with ttl
    When respondWith is called
    Then passes ttl through to SDK setExample
    */
    it('should forward ttl to setExample', async () => {
      const request = new MockSDKRequest(mockSdk, { path: '/test' });
      mockSetExample.mockResolvedValue('example-id');

      const responseData = { code: 200, ttl: 30 };
      await request.respondWith(responseData);

      expect(mockSetExample).toHaveBeenCalledOnce();
      const [conditions, data] = mockSetExample.mock.calls[0];
      expect(conditions.path).toBe('/test');
      expect(data).toEqual(responseData);
    });
  });

  describe('respondWithOnce', () => {
    /*
    Scenario: Creating one-time mock example
    Given request builder
    When respondWithOnce is called
    Then calls SDK setExample with once flag set to true
    */
    it('should call SDK setExample with once flag', async () => {
      const request = new MockSDKRequest(mockSdk, { path: '/test' });
      mockSetExample.mockResolvedValue('example-id');

      const responseData = { code: 200 };
      const result = await request.respondWithOnce(responseData);

      expect(mockSetExample).toHaveBeenCalledOnce();
      const [_conditions, data] = mockSetExample.mock.calls[0];
      expect(data.once).toBe(true);
      expect(result).toBe('example-id');
    });
  });
});
