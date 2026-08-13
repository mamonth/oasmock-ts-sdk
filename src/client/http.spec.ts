/*
Scenario: Normalizing base URL for OASMock server
Given a base URL with or without trailing slash
When normalizeBaseUrl is called
Then returns URL with /_mock suffix and no duplicate slashes

*/

import { describe, expect, it, vi } from 'vitest';
import { createHttpClient, normalizeBaseUrl } from './http';

const { mockCreateExample, mockGetRequests, mockCreateClient, mockCreateConfig } = vi.hoisted(
  () => ({
    mockCreateExample: vi.fn(),
    mockGetRequests: vi.fn(),
    mockCreateClient: vi.fn(),
    mockCreateConfig: vi.fn(),
  })
);

vi.mock('./generated', () => ({
  createExample: mockCreateExample,
  getRequests: mockGetRequests,
}));

vi.mock('./generated/client', () => ({
  createClient: mockCreateClient,
  createConfig: mockCreateConfig,
}));

describe('HTTP Client', () => {
  const mockClientInstance = {};

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateConfig.mockReturnValue({ baseUrl: 'http://localhost:19191/_mock' });
    mockCreateClient.mockReturnValue(mockClientInstance);
  });

  describe('normalizeBaseUrl', () => {
    /*
    Scenario: Normalizing URL without trailing slash
    Given base URL http://localhost:19191
    When normalizeBaseUrl is called
    Then returns http://localhost:19191/_mock
    */
    it('should add suffix to URL without trailing slash', () => {
      expect(normalizeBaseUrl('http://localhost:19191')).toBe('http://localhost:19191/_mock');
    });

    /*
    Scenario: Normalizing URL with trailing slash
    Given base URL http://localhost:19191/
    When normalizeBaseUrl is called
    Then returns http://localhost:19191/_mock (removes extra slash)
    */
    it('should handle URL with trailing slash', () => {
      expect(normalizeBaseUrl('http://localhost:19191/')).toBe('http://localhost:19191/_mock');
    });

    /*
    Scenario: Normalizing URL with multiple trailing slashes
    Given base URL http://localhost:19191//
    When normalizeBaseUrl is called
    Then returns http://localhost:19191/_mock (removes all extra slashes)
    */
    it('should handle URL with multiple trailing slashes', () => {
      expect(normalizeBaseUrl('http://localhost:19191//')).toBe('http://localhost:19191/_mock');
    });

    /*
    Scenario: Normalizing URL with path segments
    Given base URL http://example.com/api
    When normalizeBaseUrl is called
    Then returns http://example.com/api/_mock
    */
    it('should preserve path segments before adding suffix', () => {
      expect(normalizeBaseUrl('http://example.com/api')).toBe('http://example.com/api/_mock');
    });
  });

  describe('createHttpClient', () => {
    /*
    Scenario: Creating HTTP client with normalized base URL
    Given a base URL
    When createHttpClient is called
    Then creates client with normalized base URL
    */
    it('should create client with normalized base URL', () => {
      createHttpClient('http://localhost:19191');
      expect(mockCreateConfig).toHaveBeenCalledWith({
        baseUrl: 'http://localhost:19191/_mock',
      });
      expect(mockCreateClient).toHaveBeenCalledWith({ baseUrl: 'http://localhost:19191/_mock' });
    });

    /*
    Scenario: HTTP client createExample method
    Given HTTP client and example data
    When createExample is called
    Then calls generated createExample with client and body
    */
    it('should create example via generated SDK', async () => {
      const mockResponse = { data: { success: true, id: 'test-id' } };
      mockCreateExample.mockResolvedValue(mockResponse);
      const client = createHttpClient('http://localhost:19191');

      const exampleData = { path: '/test', response: { code: 200 } };
      const result = await client.createExample(exampleData);

      expect(mockCreateExample).toHaveBeenCalledWith({
        client: mockClientInstance,
        body: exampleData,
      });
      expect(result).toEqual(mockResponse.data);
    });

    /*
    Scenario: HTTP client getRequests method without params
    Given HTTP client
    When getRequests is called without parameters
    Then calls generated getRequests with client only
    */
    it('should get requests without parameters', async () => {
      const mockResponse = { data: { data: [] } };
      mockGetRequests.mockResolvedValue(mockResponse);
      const client = createHttpClient('http://localhost:19191');

      const result = await client.getRequests();

      expect(mockGetRequests).toHaveBeenCalledWith({ client: mockClientInstance });
      expect(result).toEqual(mockResponse.data);
    });

    /*
    Scenario: HTTP client getRequests method with params
    Given HTTP client and query parameters
    When getRequests is called with parameters
    Then calls generated getRequests with client and query
    */
    it('should get requests with parameters', async () => {
      const mockResponse = { data: { data: [] } };
      mockGetRequests.mockResolvedValue(mockResponse);
      const client = createHttpClient('http://localhost:19191');

      const params = { path: '/test', limit: 10 };
      const result = await client.getRequests(params);

      expect(mockGetRequests).toHaveBeenCalledWith({
        client: mockClientInstance,
        query: params,
      });
      expect(result).toEqual(mockResponse.data);
    });
  });
});
