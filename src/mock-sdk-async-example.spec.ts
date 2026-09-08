/*
Scenario: Building async examples with event/interval triggers
Given a MockSDK stub and a channel
When event/interval builders are chained with conditions, delay, and options
Then addAsyncExample is called with mapped async params
*/

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockSDK } from './mock-sdk';
import { MockSDKAsyncEventExample, MockSDKAsyncExample } from './mock-sdk-async-example';
import { SDKEvent } from './types';

const mockAddAsyncExample = vi.fn();
const mockSdk = { addAsyncExample: mockAddAsyncExample } as unknown as MockSDK;

beforeEach(() => {
  mockAddAsyncExample.mockClear();
});

function eventExample(
  name: string | undefined,
  channel = '/schema/user/updates',
  protocol = 'ws' as const
): MockSDKAsyncEventExample {
  return new MockSDKAsyncEventExample(mockSdk, channel, protocol, { kind: 'event', name });
}

function intervalExample(interval = 1000): MockSDKAsyncExample {
  return new MockSDKAsyncExample(mockSdk, '/schema/user/updates', 'ws', {
    kind: 'interval',
    interval,
  });
}

describe('MockSDKAsyncEventExample', () => {
  /*
  Scenario: Registering an event-driven example
  Given an event example with a named event
  When push is called
  Then addAsyncExample is called with the identity condition
  */
  it('should pin the event identity condition', async () => {
    const example = eventExample('user.created');
    mockAddAsyncExample.mockResolvedValue('example-1');

    const id = await example.push({ kind: 'greeting' });

    expect(id).toBe('example-1');
    expect(mockAddAsyncExample).toHaveBeenCalledWith({
      channel: '/schema/user/updates',
      protocol: 'ws',
      conditions: { '{$event.name}': 'user.created' },
      interval: undefined,
      delay: undefined,
      once: undefined,
      ttl: undefined,
      validate: undefined,
      payload: { kind: 'greeting' },
    });
  });

  /*
  Scenario: Merging user conditions with the identity
  Given an event example and extra connection conditions
  When withConditions and push are called
  Then the identity and extra conditions are both present
  */
  it('should merge user conditions with identity', async () => {
    const example = eventExample('user.created').withConditions({
      '{$connection.id}': 'conn-1',
    });
    mockAddAsyncExample.mockResolvedValue('example-1');

    await example.push({});

    const params = mockAddAsyncExample.mock.calls[0][0];
    expect(params.conditions).toEqual({
      '{$event.name}': 'user.created',
      '{$connection.id}': 'conn-1',
    });
  });

  /*
  Scenario: Registering a one-shot event example
  Given an event example
  When pushOnce is called
  Then once is true
  */
  it('should register a one-shot example via pushOnce', async () => {
    const example = eventExample('user.created');
    mockAddAsyncExample.mockResolvedValue('example-1');

    await example.pushOnce({ hello: true }, { ttl: '10s' });

    const params = mockAddAsyncExample.mock.calls[0][0];
    expect(params.once).toBe(true);
    expect(params.ttl).toBe(10);
  });

  /*
  Scenario: Delaying emission
  Given an event example
  When withDelay and push are called
  Then the delay is parsed to milliseconds
  */
  it('should parse delay to milliseconds', async () => {
    const example = eventExample('user.created').withDelay('1s');
    mockAddAsyncExample.mockResolvedValue('example-1');

    await example.push({});

    expect(mockAddAsyncExample.mock.calls[0][0].delay).toBe(1000);
  });

  /*
  Scenario: Resolving ttl durations
  Given an event example
  When push is called with a ttl string
  Then ttl is converted to whole seconds
  */
  it('should resolve ttl durations', async () => {
    const example = eventExample('user.created');
    mockAddAsyncExample.mockResolvedValue('example-1');

    await example.push({}, { ttl: '10s', validate: false });

    const params = mockAddAsyncExample.mock.calls[0][0];
    expect(params.ttl).toBe(10);
    expect(params.validate).toBe(false);
  });

  /*
  Scenario: Rejecting wildcard event identity
  Given an event example with SDKEvent.ANY
  When push is called
  Then throws because the server does not support wildcard identities
  */
  it('should throw for SDKEvent.ANY', async () => {
    const example = eventExample(SDKEvent.ANY);

    await expect(example.push({})).rejects.toThrow(
      'SDKEvent.ANY is not supported by the server for event examples'
    );
    expect(mockAddAsyncExample).not.toHaveBeenCalled();
  });

  /*
  Scenario: Building built-in trigger identity
  Given an event example for the connect trigger
  When push is called
  Then the identity pin is the built-in name
  */
  it('should support built-in triggers', async () => {
    const example = eventExample(SDKEvent.RECEIVE);
    mockAddAsyncExample.mockResolvedValue('example-1');

    await example.push({});

    expect(mockAddAsyncExample.mock.calls[0][0].conditions).toEqual({
      '{$event.name}': 'receive',
    });
  });
});

describe('MockSDKAsyncExample (interval)', () => {
  /*
  Scenario: Registering an interval example
  Given an interval example
  When push is called
  Then addAsyncExample is called with the interval
  */
  it('should register a periodic example', async () => {
    const example = intervalExample(1000);
    mockAddAsyncExample.mockResolvedValue('example-2');

    const id = await example.push({ ping: 'pong' }, { ttl: '10s', validate: false });

    expect(id).toBe('example-2');
    const params = mockAddAsyncExample.mock.calls[0][0];
    expect(params.interval).toBe(1000);
    expect(params.ttl).toBe(10);
    expect(params.validate).toBe(false);
    expect(params.conditions).toBeUndefined();
  });

  /*
  Scenario: Rejecting conditions on interval examples
  Given an interval example
  When withConditions is called
  Then throws because interval is single-trigger
  */
  it('should reject conditions on interval examples', () => {
    const example = intervalExample(1000);
    expect(() => example.withConditions({ '{$event.name}': 'x' })).toThrow(
      'Interval examples are single-trigger and cannot have conditions'
    );
  });
});
