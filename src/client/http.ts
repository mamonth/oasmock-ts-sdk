import { MOCK_PATH_SUFFIX } from '../constants';
import { createExample, getRequests, type Options } from './generated';
import { createClient, createConfig } from './generated/client';
import type { AddExampleRequest, GetRequestsData } from './generated/types.gen';

/**
 * Trims trailing slashes from the base URL and appends the mock server path suffix.
 */
export function normalizeBaseUrl(baseUrl: string): string {
  const normalized = baseUrl.replace(/\/+$/, '');
  return `${normalized}${MOCK_PATH_SUFFIX}`;
}

/**
 * Creates an HTTP client wrapping the generated OASMock control API.
 */
export function createHttpClient(baseUrl: string) {
  const client = createClient(
    createConfig({
      baseUrl: normalizeBaseUrl(baseUrl),
    })
  );

  return {
    async createExample(data: AddExampleRequest) {
      const response = await createExample({
        client,
        body: data,
      });
      return response.data;
    },
    async getRequests(params?: GetRequestsData['query']) {
      const options: Options<GetRequestsData> = { client };
      if (params !== undefined) {
        options.query = params;
      }
      const response = await getRequests(options);
      return response.data;
    },
  };
}

export type HttpClient = ReturnType<typeof createHttpClient>;
