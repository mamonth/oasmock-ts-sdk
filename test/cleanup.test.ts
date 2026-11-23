/*
Scenario: Isolated example cleanup per SDK scope
Given a running OASMock server shared by multiple scopes
When each scope tracks and clears its own examples
Then only the cleared scope's examples are removed from the server

Related spec scenarios: scope cleanup
*/

import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MockSDK } from '../dist/oasmock-sdk.esm.js';
import { DEFAULT_TIMEOUTS } from '../src/constants';
import { connectAsyncConsumer, sleep } from './_shared/async';
import { startOASMockServer } from './_shared/fixtures';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const SYNC_PORT = 19195;
const ASYNC_PORT = 19196;
const CHANNEL = '/schema-prefix/user/updates';

async function getJson(baseUrl: string, path: string): Promise<unknown> {
  const response = await fetch(`${baseUrl}${path}`);
  return response.json();
}

describe('Scope cleanup integration', () => {
  let server: Awaited<ReturnType<typeof startOASMockServer>>;
  let sdk: MockSDK;

  beforeAll(async () => {
    server = await startOASMockServer({ port: SYNC_PORT });
    sdk = new MockSDK(server.baseUrl);
  }, DEFAULT_TIMEOUTS.SERVER_START);

  afterAll(async () => {
    if (server) {
      await server.stop();
    }
  }, DEFAULT_TIMEOUTS.SERVER_STOP);

  /*
  Scenario: Clearing one scope leaves sibling examples intact
  Given two scopes with examples on different query conditions
  When the first scope is cleared
  Then only its example disappears and the sibling mock still responds
  */
  it('should clear only the scope that owns the example', async () => {
    const first = sdk.createScope();
    const second = sdk.createScope();

    try {
      await first
        .onRequest('/ping')
        .withSearchParams({ scope: 'first' })
        .respondWith({ body: { message: 'first' } });
      await second
        .onRequest('/ping')
        .withSearchParams({ scope: 'second' })
        .respondWith({ body: { message: 'second' } });

      const result = await first.clearExamples();

      expect(result).toEqual({ deleted: [expect.any(String)] });
      expect(first.exampleIds.size).toBe(0);
      expect(second.exampleIds.size).toBe(1);
      expect(await getJson(server.baseUrl, '/ping?scope=first')).toEqual({
        error: 'No example available',
      });
      expect(await getJson(server.baseUrl, '/ping?scope=second')).toEqual({
        message: 'second',
      });

      await second.clearExamples();
      expect(await getJson(server.baseUrl, '/ping?scope=second')).toEqual({
        error: 'No example available',
      });
    } finally {
      await first.clearExamples();
      await second.clearExamples();
    }
  });

  /*
  Scenario: Treating an already-deleted example as cleaned up
  Given an example that was deleted directly
  When its ID is re-added to the ledger and the scope is cleared
  Then cleanup succeeds through the 404 idempotency path
  */
  it('should treat an already-deleted example as cleaned up', async () => {
    const scope = sdk.createScope();

    try {
      const id = await scope.onRequest('/ping').respondWith({ body: { message: 'once' } });

      await scope.deleteExample(id);
      scope.exampleIds.add(id);

      const result = await scope.clearExamples();

      expect(result).toEqual({ deleted: [id] });
      expect(scope.exampleIds.size).toBe(0);
    } finally {
      await scope.clearExamples();
    }
  });

  /*
  Scenario: Local ledger mutations do not touch the server
  Given an example registered through a scope
  When its ID is removed from the ledger locally
  Then cleanup sends no requests and the mock keeps responding
  */
  it('should keep server examples when the ledger is mutated locally', async () => {
    const scope = sdk.createScope();
    let id: string | undefined;

    try {
      id = await scope
        .onRequest('/ping')
        .withSearchParams({ scope: 'sticky' })
        .respondWith({ body: { message: 'sticky' } });

      expect(scope.exampleIds.remove(id)).toBe(true);
      const result = await scope.clearExamples();

      expect(result).toEqual({ deleted: [] });
      expect(await getJson(server.baseUrl, '/ping?scope=sticky')).toEqual({ message: 'sticky' });

      scope.exampleIds.add(id);
      await scope.clearExamples();
      expect(await getJson(server.baseUrl, '/ping?scope=sticky')).toEqual({
        error: 'No example available',
      });
    } finally {
      if (id && scope.exampleIds.has(id)) {
        await scope.clearExamples();
      }
    }
  });
});

describe('Scope cleanup of async examples', () => {
  let server: Awaited<ReturnType<typeof startOASMockServer>>;
  let sdk: MockSDK;

  beforeAll(async () => {
    server = await startOASMockServer({
      apiSpec: join(__dirname, '_shared/resources/test-async.yaml'),
      prefix: '/schema-prefix',
      port: ASYNC_PORT,
    });
    sdk = new MockSDK(server.baseUrl);
  }, DEFAULT_TIMEOUTS.SERVER_START);

  afterAll(async () => {
    if (server) {
      await server.stop();
    }
  }, DEFAULT_TIMEOUTS.SERVER_STOP);

  /*
  Scenario: Clearing a scope stops its interval delivery
  Given a scope with an interval example
  When the scope is cleared
  Then periodic deliveries stop
  */
  it('should stop interval delivery on clearExamples', async () => {
    const consumer = await connectAsyncConsumer(server.baseUrl, CHANNEL);
    const scope = sdk.createScope();

    try {
      const id = await scope
        .asyncChannel(CHANNEL)
        .onInterval('100ms')
        .push({ tick: 'scope' }, { ttl: '30s' });

      await consumer.waitForMessage((m) => (m as { tick?: string }).tick === 'scope');
      const before = consumer.messages().length;

      const result = await scope.clearExamples();

      expect(result).toEqual({ deleted: [id] });
      expect(scope.exampleIds.size).toBe(0);
      await sleep(400);
      expect(consumer.messages().length).toBeLessThanOrEqual(before + 1);
    } finally {
      await scope.clearExamples();
      consumer.close();
    }
  });
});
