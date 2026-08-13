/*
Scenario: SDK integration with running OASMock server
Given a running OASMock server
When SDK is used to mock responses
Then mocked responses are returned for matching requests
And request history can be retrieved

Related spec scenarios: RS.SDK.1, RS.SDK.2, RS.SDK.3
*/

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MockSDK } from '../dist/oasmock-sdk.esm.js';
import { DEFAULT_TIMEOUTS } from '../src/constants.js';
import { startOASMockServer } from './_shared/fixtures.js';

describe('SDK Integration', () => {
  let server: Awaited<ReturnType<typeof startOASMockServer>>;
  let sdk: MockSDK;

  beforeEach(async () => {
    server = await startOASMockServer();
    sdk = new MockSDK(server.baseUrl);
  }, DEFAULT_TIMEOUTS.SERVER_START);

  afterEach(async () => {
    if (server) {
      await server.stop();
    }
  }, DEFAULT_TIMEOUTS.SERVER_STOP);

  /*
  Scenario: Mocking simple GET endpoint
  Given running OASMock server with test API
  When SDK creates mock for /ping GET endpoint
  Then requests to /ping receive mocked response
  */
  it('should mock a simple GET response', async () => {
    const exampleId = await sdk.onRequest('/ping', 'GET').respondWith({
      code: 200,
      body: { message: 'mocked pong' },
    });

    expect(exampleId).toBeTruthy();

    const response = await fetch(`${server.baseUrl}/ping`);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ message: 'mocked pong' });
  });

  /*
  Scenario: Using one-time mock example
  Given running OASMock server
  When SDK creates one-time mock for /ping
  Then first request receives mocked response, second receives default or error
  */
  it('should support one-time examples', async () => {
    const exampleId = await sdk.onRequest('/ping', 'GET').respondWithOnce({
      code: 200,
      body: { message: 'one time' },
    });

    expect(exampleId).toBeTruthy();

    const response1 = await fetch(`${server.baseUrl}/ping`);
    const data1 = await response1.json();
    expect(data1).toEqual({ message: 'one time' });

    const response2 = await fetch(`${server.baseUrl}/ping`);
    const data2 = await response2.json();
    expect(data2).not.toEqual({ message: 'one time' });
  });

  /*
  Scenario: Mocking endpoint with query parameter conditions
  Given running OASMock server
  When SDK creates mock conditioned on query parameter test=value
  Then requests with matching query parameter receive mocked response
  */
  it('should mock with query parameters', async () => {
    await sdk
      .onRequest('/ping')
      .withSearchParams({ test: 'value' })
      .respondWith({
        code: 200,
        body: { query: 'matched' },
      });

    const response = await fetch(`${server.baseUrl}/ping?test=value`);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ query: 'matched' });
  });

  /*
  Scenario: Retrieving request history from mock server
  Given running OASMock server with mocked endpoint
  When multiple requests are made to mocked endpoint
  Then SDK can retrieve request history filtered by path
  */
  it('should retrieve request history', async () => {
    await sdk.onRequest('/ping').respondWith({ code: 200 });

    await fetch(`${server.baseUrl}/ping`);
    await fetch(`${server.baseUrl}/ping`);

    const history = await sdk.getRequestList({ path: '/ping' });

    expect(history.length).toBeGreaterThanOrEqual(2);
    expect(history[0].url).toContain('/ping');
    expect(history[0].method).toBe('GET');
  });

  /*
  Scenario: Mock example with TTL expires after duration
  Given running OASMock server
  When SDK creates mock for /ping with ttl of 1 second
  Then mocked response is served immediately and stops after TTL expires
  */
  it('should expire mock example after ttl', async () => {
    const exampleId = await sdk.onRequest('/ping', 'GET').respondWith({
      code: 200,
      body: { message: 'mocked ttl' },
      ttl: 1,
    });

    expect(exampleId).toBeTruthy();

    const immediate = await fetch(`${server.baseUrl}/ping`);
    const immediateData = await immediate.json();
    expect(immediateData).toEqual({ message: 'mocked ttl' });

    const deadline = Date.now() + 5000;
    let expired = false;
    while (Date.now() < deadline) {
      const response = await fetch(`${server.baseUrl}/ping`);
      const data = await response.json();
      if (JSON.stringify(data) !== JSON.stringify({ message: 'mocked ttl' })) {
        expired = true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    expect(expired).toBe(true);
  });

  /*
  Scenario: SDK base URL normalization with trailing slash
  Given running OASMock server
  When SDK is instantiated with base URL containing trailing slash
  Then SDK works correctly (normalization handled internally)
  */
  it('should normalize base URL with trailing slash', async () => {
    const sdkWithSlash = new MockSDK(`${server.baseUrl}/`);
    const exampleId = await sdkWithSlash.onRequest('/ping').respondWith({
      code: 200,
      body: { normalized: true },
    });

    expect(exampleId).toBeTruthy();

    const response = await fetch(`${server.baseUrl}/ping`);
    const data = await response.json();
    expect(data.normalized).toBe(true);
  });
});
