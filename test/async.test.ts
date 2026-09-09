/*
Scenario: Async (AsyncAPI) management API integration
Given a running OASMock server with an AsyncAPI schema under a prefix
When the SDK drives channel pushes, event/interval examples, consumers, and the stream
Then consumers receive delivered messages and the SDK observes server state

Related spec scenarios: RS.SDK.4 (async examples), RS.SDK.5 (consumers), RS.SDK.6 (stream)
*/

import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MockSDK } from '../dist/oasmock-sdk.esm.js';
import { DEFAULT_TIMEOUTS } from '../src/constants';
import { connectAsyncConsumer, sleep } from './_shared/async';
import { startOASMockServer } from './_shared/fixtures';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ASYNC_PORT = 19193;
const CHANNEL = '/schema-prefix/user/updates';

async function waitFor<T>(
  poll: () => T | undefined,
  timeoutMs = DEFAULT_TIMEOUTS.INTEGRATION_TEST
): Promise<T> {
  const started = Date.now();
  while (true) {
    const value = poll();
    if (value !== undefined) return value;
    if (Date.now() - started > timeoutMs) {
      throw new Error('Timeout waiting for async condition');
    }
    await sleep(20);
  }
}

describe('Async API Integration', () => {
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
  Scenario: Instant broadcast push
  Given a connected consumer on the channel
  When the SDK pushes a broadcast message
  Then the consumer receives it
  */
  it('should push an instant broadcast message', async () => {
    const consumer = await connectAsyncConsumer(server.baseUrl, CHANNEL);

    await sdk.asyncChannel(CHANNEL).push({ kind: 'instant' });

    const message = await consumer.waitForMessage(
      (m) => (m as { kind?: string }).kind === 'instant'
    );
    expect(message).toEqual({ kind: 'instant' });
    consumer.close();
  });

  /*
  Scenario: Event-driven example delivery
  Given a consumer and a registered event example
  When fireEvent fires the matching event
  Then the consumer receives the templated payload
  */
  it('should deliver an event-driven example after fireEvent', async () => {
    const consumer = await connectAsyncConsumer(server.baseUrl, CHANNEL);

    const id = await sdk
      .asyncChannel(CHANNEL)
      .onEvent('order.created')
      .push({ userName: '{$event.userName}' });

    await sdk.fireEvent('order.created', { payload: { userName: 'alice' } });

    const message = await consumer.waitForMessage(
      (m) => (m as { userName?: string }).userName === 'alice'
    );
    expect(message).toEqual({ userName: 'alice' });
    await sdk.deleteExample(id);
    consumer.close();
  });

  /*
  Scenario: Delayed event example
  Given a consumer and a pushOnce example with delay
  When the event fires
  Then the payload is delivered after the delay
  */
  it('should deliver a delayed event example', async () => {
    const consumer = await connectAsyncConsumer(server.baseUrl, CHANNEL);

    const id = await sdk.asyncChannel(CHANNEL).onEvent('notice').withDelay('50ms').pushOnce({
      note: 'delayed',
    });

    await sdk.fireEvent('notice', { payload: {} });

    const message = await consumer.waitForMessage(
      (m) => (m as { note?: string }).note === 'delayed'
    );
    expect(message).toEqual({ note: 'delayed' });
    await sdk.deleteExample(id);
    consumer.close();
  });

  /*
  Scenario: Interval example and cancellation
  Given a consumer and a registered interval example
  When the example is deleted
  Then the periodic delivery stops
  */
  it('should stop interval delivery on deleteExample', async () => {
    const consumer = await connectAsyncConsumer(server.baseUrl, CHANNEL);

    const id = await sdk
      .asyncChannel(CHANNEL)
      .onInterval('100ms')
      .push({ tick: 't' }, { ttl: '30s' });

    await consumer.waitForMessage((m) => (m as { tick?: string }).tick === 't');
    const before = consumer.messages().length;

    await sdk.deleteExample(id);
    await sleep(400);

    const after = consumer.messages().length;
    expect(after).toBeLessThanOrEqual(before + 1);
    consumer.close();
  });

  /*
  Scenario: Consumer listing and targeted actions
  Given a connected consumer
  When the SDK lists consumers and pushes to one of them
  Then the targeted consumer receives the message
  */
  it('should list consumers and push to one of them', async () => {
    const consumer = await connectAsyncConsumer(server.baseUrl, CHANNEL);

    const list = await sdk.asyncChannel(CHANNEL).getConsumerList();
    expect(list.length).toBeGreaterThanOrEqual(1);

    const target = list.at(-1) as NonNullable<(typeof list)[number]>;
    await target.push({ dm: true });

    const message = await consumer.waitForMessage((m) => (m as { dm?: boolean }).dm === true);
    expect(message).toEqual({ dm: true });
    consumer.close();
  });

  /*
  Scenario: Force-disconnecting a consumer
  Given a connected consumer
  When its disconnect({abrupt:true}) is invoked
  Then the consumer leaves the connection list
  */
  it('should force-disconnect a consumer', async () => {
    const consumer = await connectAsyncConsumer(server.baseUrl, CHANNEL);

    const list = await sdk.getConsumerList(CHANNEL);
    const target = list.find((c) => c.connectionId) as NonNullable<(typeof list)[number]>;

    await target.disconnect({ abrupt: true });

    await waitFor(async () => {
      const remaining = await sdk.getConsumerList(CHANNEL);
      return remaining.some((c) => c.connectionId === target.connectionId) ? undefined : true;
    });
    consumer.close();
  });

  /*
  Scenario: Streaming event envelopes
  Given the management stream subscribed to a fired event name
  When fireEvent fires that event
  Then an event envelope with that name is received
  */
  it('should stream event envelopes via sdk.on', async () => {
    const envelopes: Array<{ type: string; event?: { name?: string } }> = [];
    const off = sdk.on('order.fired', (e) => envelopes.push(e));
    await sleep(150);

    await sdk.fireEvent('order.fired', { payload: { z: 1 } });

    await waitFor(() => envelopes[0]);
    expect(envelopes[0].type).toBe('event');
    expect(envelopes[0].event?.name).toBe('order.fired');
    off();
  });

  /*
  Scenario: Streaming consumer lifecycle envelopes
  Given the management stream subscribed to consumer envelopes
  When a consumer connects
  Then a consumer envelope with the connected action is received
  */
  it('should stream consumer envelopes via sdk.on', async () => {
    const envelopes: Array<{ type: string; consumer?: { action?: string } }> = [];
    const off = sdk.on('consumer', (e) => envelopes.push(e));
    await sleep(150);

    const consumer = await connectAsyncConsumer(server.baseUrl, CHANNEL);

    await waitFor(() => envelopes[0]);
    expect(envelopes[0].type).toBe('consumer');
    expect(envelopes[0].consumer?.action).toBe('connected');
    off();
    consumer.close();
  });
});
