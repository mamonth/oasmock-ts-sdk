/*
Scenario: Mapping between SDK types and generated API types
Given SDK request conditions and response data
When mapping functions are called
Then produce correct generated API request structures
*/

import { describe, expect, it, vi } from 'vitest';
import {
  mapAsyncExampleToRequest,
  mapConditionsToAddExampleRequest,
  mapHistoryOptionsToGetRequestsData,
  mapResponseDataToExampleResponse,
} from './mappers';

describe('Mappers', () => {
  describe('mapResponseDataToExampleResponse', () => {
    /*
    Scenario: Mapping response data with all fields
    Given response data with code, headers, and body
    When mapResponseDataToExampleResponse is called
    Then returns ExampleResponse with all fields
    */
    it('should map all response fields', () => {
      const responseData = {
        code: 201,
        headers: { 'content-type': 'application/json' },
        body: { id: 123 },
      };

      const result = mapResponseDataToExampleResponse(responseData);

      expect(result).toEqual({
        code: 201,
        headers: { 'content-type': 'application/json' },
        body: { id: 123 },
      });
    });

    /*
    Scenario: Mapping response data with partial fields
    Given response data with only code
    When mapResponseDataToExampleResponse is called
    Then returns ExampleResponse with only code
    */
    it('should handle partial response data', () => {
      const responseData = { code: 404 };

      const result = mapResponseDataToExampleResponse(responseData);

      expect(result).toEqual({ code: 404 });
    });

    /*
    Scenario: Mapping response data with array body
    Given response data with array body and no code
    When mapResponseDataToExampleResponse is called
    Then returns ExampleResponse with array body and default code 200
    */
    it('should handle array body', () => {
      const responseData = { body: [1, 2, 3] };

      const result = mapResponseDataToExampleResponse(responseData);

      expect(result).toEqual({ code: 200, body: [1, 2, 3] });
    });

    /*
    Scenario: Defaulting code to 200 when omitted
    Given response data without a code
    When mapResponseDataToExampleResponse is called
    Then returns ExampleResponse with default code 200
    */
    it('should default code to 200 when omitted', () => {
      const result = mapResponseDataToExampleResponse({ body: { message: 'pong' } });

      expect(result).toEqual({ code: 200, body: { message: 'pong' } });
    });
  });

  describe('mapConditionsToAddExampleRequest', () => {
    /*
    Scenario: Mapping conditions with path and method only
    Given conditions with only path and method
    When mapConditionsToAddExampleRequest is called
    Then returns AddExampleRequest with empty conditions omitted
    */
    it('should map basic conditions without extra conditions', () => {
      const conditions = { path: '/test', method: 'POST' as const };
      const responseData = { code: 200 };

      const result = mapConditionsToAddExampleRequest(conditions, responseData);

      expect(result).toEqual({
        path: '/test',
        method: 'POST',
        response: { code: 200 },
      });
      expect(result.conditions).toBeUndefined();
    });

    /*
    Scenario: Mapping conditions with extra conditions
    Given conditions with extra condition keys
    When mapConditionsToAddExampleRequest is called
    Then returns AddExampleRequest with conditions object
    */
    it('should include extra conditions in conditions object', () => {
      const conditions = {
        path: '/test',
        '{$request.query.id}': '123',
        '{$request.header.auth}': 'Bearer token',
      };
      const responseData = { code: 200 };

      const result = mapConditionsToAddExampleRequest(conditions, responseData);

      expect(result.path).toBe('/test');
      expect(result.method).toBeUndefined();
      expect(result.conditions).toEqual({
        '{$request.query.id}': '123',
        '{$request.header.auth}': 'Bearer token',
      });
    });

    /*
    Scenario: Mapping with once flag from response data
    Given response data with once flag
    When mapConditionsToAddExampleRequest is called
    Then returns AddExampleRequest with once flag
    */
    it('should propagate once flag from response data', () => {
      const conditions = { path: '/test' };
      const responseData = { code: 200, once: true };

      const result = mapConditionsToAddExampleRequest(conditions, responseData);

      expect(result.once).toBe(true);
    });

    /*
    Scenario: Mapping with explicit once parameter overriding response data
    Given response data without once flag and explicit once parameter
    When mapConditionsToAddExampleRequest is called with once parameter
    Then returns AddExampleRequest with once flag from parameter
    */
    it('should allow explicit once parameter to override', () => {
      const conditions = { path: '/test' };
      const responseData = { code: 200 };

      const result = mapConditionsToAddExampleRequest(conditions, responseData, true);

      expect(result.once).toBe(true);
    });

    /*
    Scenario: Mapping with validate flag
    Given response data with validate flag
    When mapConditionsToAddExampleRequest is called
    Then returns AddExampleRequest with validate flag
    */
    it('should propagate validate flag from response data', () => {
      const conditions = { path: '/test' };
      const responseData = { code: 200, validate: true };

      const result = mapConditionsToAddExampleRequest(conditions, responseData);

      expect(result.validate).toBe(true);
    });

    /*
    Scenario: Mapping with ttl from response data
    Given response data with ttl
    When mapConditionsToAddExampleRequest is called
    Then returns AddExampleRequest with ttl at top level
    */
    it('should propagate ttl from response data', () => {
      const conditions = { path: '/test' };
      const responseData = { code: 200, ttl: 60 };

      const result = mapConditionsToAddExampleRequest(conditions, responseData);

      expect(result.ttl).toBe(60);
    });

    /*
    Scenario: Omitting ttl when response data has none
    Given response data without ttl
    When mapConditionsToAddExampleRequest is called
    Then omits ttl from AddExampleRequest
    */
    it('should omit ttl when response data has no ttl', () => {
      const conditions = { path: '/test' };
      const responseData = { code: 200 };

      const result = mapConditionsToAddExampleRequest(conditions, responseData);

      expect(result).not.toHaveProperty('ttl');
    });
  });

  describe('mapAsyncExampleToRequest', () => {
    /*
    Scenario: Mapping an event-driven async example
    Given channel, protocol, conditions, and payload
    When mapAsyncExampleToRequest is called
    Then returns the async branch with identity conditions and response payload
    */
    it('should map event-driven example', () => {
      const result = mapAsyncExampleToRequest({
        channel: '/schema/user/updates',
        protocol: 'ws',
        conditions: { '{$event.name}': 'user.created' },
        payload: { kind: 'greeting' },
      });

      expect(result).toEqual({
        channel: '/schema/user/updates',
        protocol: 'ws',
        conditions: { '{$event.name}': 'user.created' },
        response: { code: 200, body: { kind: 'greeting' } },
      });
    });

    /*
    Scenario: Mapping an interval-driven async example
    Given channel and interval
    When mapAsyncExampleToRequest is called
    Then returns the async branch with interval and default response
    */
    it('should map interval example', () => {
      const result = mapAsyncExampleToRequest({
        channel: '/schema/user/updates',
        interval: 1000,
        payload: { ping: 'pong' },
      });

      expect(result.interval).toBe(1000);
      expect(result.channel).toBe('/schema/user/updates');
      expect(result.conditions).toBeUndefined();
      expect(result.response).toEqual({ code: 200, body: { ping: 'pong' } });
    });

    /*
    Scenario: Mapping an async example targeting a SignalR hub channel
    Given channel, signalr protocol, and payload
    When mapAsyncExampleToRequest is called
    Then returns the async branch with the signalr protocol and array payload passed through
    */
    it('should map signalr hub channel example', () => {
      const payload: Array<{ orderId: string }> = [{ orderId: 'grid-1' }];
      const result = mapAsyncExampleToRequest({
        channel: '/qoden/OpenOrders',
        protocol: 'signalr',
        payload,
      });

      expect(result).toEqual({
        channel: '/qoden/OpenOrders',
        protocol: 'signalr',
        response: { code: 200, body: payload },
      });
    });

    /*
    Scenario: Omitting empty conditions and optional fields
    Given parameters with no conditions and no extras
    When mapAsyncExampleToRequest is called
    Then omits conditions and optional fields
    */
    it('should omit empty conditions and optional fields', () => {
      const result = mapAsyncExampleToRequest({ channel: '/schema/user/updates', payload: {} });

      expect(result).toEqual({
        channel: '/schema/user/updates',
        response: { code: 200, body: {} },
      });
      expect(result.conditions).toBeUndefined();
      expect(result).not.toHaveProperty('protocol');
      expect(result).not.toHaveProperty('interval');
      expect(result).not.toHaveProperty('delay');
    });

    /*
    Scenario: Forwarding once, ttl, validate and delay
    Given full lifetime options
    When mapAsyncExampleToRequest is called
    Then forwards them onto the async branch
    */
    it('should forward lifetime options', () => {
      const result = mapAsyncExampleToRequest({
        channel: '/schema/user/updates',
        once: true,
        ttl: 10,
        validate: false,
        delay: 150,
        payload: {},
      });

      expect(result.once).toBe(true);
      expect(result.ttl).toBe(10);
      expect(result.validate).toBe(false);
      expect(result.delay).toBe(150);
    });
  });

  describe('mapHistoryOptionsToGetRequestsData', () => {
    /*
    Scenario: Mapping empty history options
    Given undefined options
    When mapHistoryOptionsToGetRequestsData is called
    Then returns undefined
    */
    it('should return undefined for undefined options', () => {
      const result = mapHistoryOptionsToGetRequestsData();
      expect(result).toBeUndefined();
    });

    /*
    Scenario: Mapping history options with basic filters
    Given options with path and limit
    When mapHistoryOptionsToGetRequestsData is called
    Then returns query object with path and limit
    */
    it('should map basic filter options', () => {
      const options = { path: '/test', limit: 10 };

      const result = mapHistoryOptionsToGetRequestsData(options);

      expect(result).toEqual({ path: '/test', limit: 10 });
    });

    /*
    Scenario: Mapping history options with relative time strings
    Given options with relative time strings since and till
    When mapHistoryOptionsToGetRequestsData is called
    Then converts relative times to absolute timestamps
    */
    it('should convert relative time strings to timestamps', () => {
      const now = Date.now();
      const options = { since: '-10s', till: '+1h' };

      const result = mapHistoryOptionsToGetRequestsData(options);

      expect(result).toHaveProperty('time_from');
      expect(result).toHaveProperty('time_till');
      expect(typeof result?.time_from).toBe('number');
      expect(typeof result?.time_till).toBe('number');
      // time_from should be ~10 seconds ago
      expect(result?.time_from).toBeLessThan(now);
      expect(result?.time_from).toBeGreaterThan(now - 11000);
      // time_till should be ~1 hour in future
      expect(result?.time_till).toBeGreaterThan(now);
      expect(result?.time_till).toBeLessThan(now + 3601000);
    });

    /*
    Scenario: Mapping history options with absolute timestamps
    Given options with numeric since and till
    When mapHistoryOptionsToGetRequestsData is called
    Then passes numeric values unchanged
    */
    it('should pass numeric timestamps unchanged', () => {
      const options = { since: 1234567890, till: 9876543210 };

      const result = mapHistoryOptionsToGetRequestsData(options);

      expect(result).toEqual({ time_from: 1234567890, time_till: 9876543210 });
    });

    /*
    Scenario: Mapping history options with mixed time values
    Given options with relative since and numeric till
    When mapHistoryOptionsToGetRequestsData is called
    Then converts relative since, passes numeric till
    */
    it('should handle mixed relative and absolute times', () => {
      const now = Date.now();
      const options = { since: '-5m', till: 9876543210 };

      const result = mapHistoryOptionsToGetRequestsData(options);

      expect(result?.time_from).toBeLessThan(now);
      expect(result?.time_till).toBe(9876543210);
    });

    /*
    Scenario: Mapping history options with undefined time values
    Given options with undefined since or till
    When mapHistoryOptionsToGetRequestsData is called
    Then omits undefined values
    */
    it('should omit undefined time values', () => {
      const options = { path: '/test', since: undefined, till: undefined };

      const result = mapHistoryOptionsToGetRequestsData(options);

      expect(result).toEqual({ path: '/test' });
      expect(result).not.toHaveProperty('time_from');
      expect(result).not.toHaveProperty('time_till');
    });
  });

  describe('parseRelativeTime', () => {
    // Note: parseRelativeTime is not exported, we test it through mapHistoryOptionsToGetRequestsData
    // but we can also test error cases indirectly

    /*
    Scenario: Parsing invalid relative time format
    Given invalid relative time string
    When mapHistoryOptionsToGetRequestsData is called
    Then throws informative error
    */
    it('should throw error for invalid relative time format', () => {
      const options = { since: 'invalid' };

      expect(() => mapHistoryOptionsToGetRequestsData(options)).toThrow(
        "Invalid relative time format: invalid. Expected format like '-10s', '+2h'"
      );
    });

    /*
    Scenario: Parsing relative time with missing unit
    Given malformed relative time string
    When mapHistoryOptionsToGetRequestsData is called
    Then throws error
    */
    it('should throw error for malformed relative time', () => {
      const options = { since: '10' };

      expect(() => mapHistoryOptionsToGetRequestsData(options)).toThrow(
        "Invalid relative time format: 10. Expected format like '-10s', '+2h'"
      );
    });

    /*
    Scenario: Parsing relative time with zero amount
    Given relative time with zero amount
    When mapHistoryOptionsToGetRequestsData is called
    Then converts correctly
    */
    it('should handle zero amount', () => {
      const mockNow = 1234567890;
      const spy = vi.spyOn(Date, 'now').mockReturnValue(mockNow);
      try {
        const options = { since: '-0s' };
        const result = mapHistoryOptionsToGetRequestsData(options);
        expect(result?.time_from).toBe(mockNow);
      } finally {
        spy.mockRestore();
      }
    });

    /*
    Scenario: Parsing relative time with different units
    Given relative time strings with s, m, h, d units
    When mapHistoryOptionsToGetRequestsData is called
    Then converts with correct multipliers
    */
    it('should handle all time units', () => {
      const options1 = { since: '-30s' };
      const options2 = { since: '-2m' };
      const options3 = { since: '-3h' };
      const options4 = { since: '-1d' };

      const result1 = mapHistoryOptionsToGetRequestsData(options1);
      const result2 = mapHistoryOptionsToGetRequestsData(options2);
      const result3 = mapHistoryOptionsToGetRequestsData(options3);
      const result4 = mapHistoryOptionsToGetRequestsData(options4);

      expect(result1?.time_from).toBeDefined();
      expect(result2?.time_from).toBeDefined();
      expect(result3?.time_from).toBeDefined();
      expect(result4?.time_from).toBeDefined();
    });

    /*
    Scenario: Parsing relative time with positive offset
    Given relative time with positive sign
    When mapHistoryOptionsToGetRequestsData is called
    Then returns future timestamp
    */
    it('should handle positive offset (future time)', () => {
      const now = Date.now();
      const options = { till: '+30s' };

      const result = mapHistoryOptionsToGetRequestsData(options);

      expect(result?.time_till).toBeGreaterThan(now);
      expect(result?.time_till).toBeLessThan(now + 31000);
    });

    /*
    Scenario: Parsing empty relative time string
    Given empty string as relative time
    When mapHistoryOptionsToGetRequestsData is called
    Then returns undefined (filtered out)
    */
    it('should treat empty string as undefined', () => {
      const options = { since: '' };

      const result = mapHistoryOptionsToGetRequestsData(options);

      expect(result).not.toHaveProperty('time_from');
    });
  });
});
