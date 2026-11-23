import { normalizeBaseUrl } from '../internal/url';
import {
  createExample,
  deleteExample as deleteExampleCall,
  disconnectConsumer as disconnectConsumerCall,
  fireEvent as fireEventCall,
  getRequests,
  listConsumers,
  type Options,
  postMessage,
} from './generated';
import { createClient, createConfig } from './generated/client';
import type {
  AddExampleRequest,
  DisconnectConsumerData,
  FireEventRequest,
  GetRequestsData,
  ListConsumersData,
  MessagesRequest,
} from './generated/types.gen';

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
    async deleteExample(exampleId: string, signal?: AbortSignal) {
      const response = await deleteExampleCall({
        client,
        path: { exampleId },
        ...(signal !== undefined ? { signal } : {}),
      });
      return { status: response.response?.status, error: response.error };
    },
    async getRequests(params?: GetRequestsData['query']) {
      const options: Options<GetRequestsData> = { client };
      if (params !== undefined) {
        options.query = params;
      }
      const response = await getRequests(options);
      return response.data;
    },
    async fireEvent(body: FireEventRequest) {
      const response = await fireEventCall({ client, body });
      return response.data;
    },
    async postMessage(body: MessagesRequest) {
      const response = await postMessage({ client, body });
      return response.data;
    },
    async listConsumers(channel?: string) {
      const options: Options<ListConsumersData> = { client };
      if (channel !== undefined) {
        options.query = { channel };
      }
      const response = await listConsumers(options);
      return response.data;
    },
    async disconnectConsumer(connectionId: string, query?: DisconnectConsumerData['query']) {
      const options: Options<DisconnectConsumerData> = { client, path: { connectionId } };
      if (query !== undefined) {
        options.query = query;
      }
      const response = await disconnectConsumerCall(options);
      return response.data;
    },
  };
}

export type HttpClient = ReturnType<typeof createHttpClient>;
