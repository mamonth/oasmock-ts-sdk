/*
Scenario: Async channel facade delegation
Given a MockSDK stub and an address
When channel trigger/push/sugar methods are called
Then they delegate to the SDK with the right parameters
*/

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockSDK } from './mock-sdk';
import { MockSDKAsyncChannel } from './mock-sdk-async-channel';

const mockPushToChannel = vi.fn();
const mockFireEvent = vi.fn();
const mockGetConsumerList = vi.fn();
const mockSdk = {
  pushToChannel: mockPushToChannel,
  fireEvent: mockFireEvent,
  getConsumerList: mockGetConsumerList,
} as unknown as MockSDK;

describe('MockSDKAsyncChannel', () => {
  const channel = new MockSDKAsyncChannel(mockSdk, '/schema/user/updates', 'ws');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  /*
  Scenario: Starting an event example builder
  Given the channel
  When onEvent is called
  Then returns an event example bound to the channel
  */
  it('should create an event example bound to the channel', () => {
    const example = channel.onEvent('user.created');

    expect(example).toBeDefined();
    expect(typeof example.push).toBe('function');
    expect(typeof example.pushOnce).toBe('function');
    expect(typeof example.withDelay).toBe('function');
  });

  /*
  Scenario: Starting an interval example builder
  Given the channel
  When onInterval is called with a duration string
  Then returns an interval example
  */
  it('should create an interval example', () => {
    const example = channel.onInterval('1s');

    expect(example).toBeDefined();
    expect(typeof example.push).toBe('function');
    expect(typeof example.withConditions).toBe('function');
  });

  /*
  Scenario: Publishing a message through the channel
  Given the channel
  When push is called
  Then pushes a broadcast message via the SDK
  */
  it('should push a broadcast message', async () => {
    mockPushToChannel.mockResolvedValue(undefined);

    await channel.push({ kind: 'ping' });

    expect(mockPushToChannel).toHaveBeenCalledWith('/schema/user/updates', {
      payload: { kind: 'ping' },
    });
  });

  /*
  Scenario: Firing an event through the channel sugar
  Given the channel
  When fireEvent is called
  Then delegates to the SDK
  */
  it('should delegate fireEvent to the SDK', async () => {
    mockFireEvent.mockResolvedValue(undefined);

    await channel.fireEvent('user.created', { payload: { n: 1 } });

    expect(mockFireEvent).toHaveBeenCalledWith('user.created', { payload: { n: 1 } });
  });

  /*
  Scenario: Listing channel consumers
  Given the channel
  When getConsumerList is called
  Then delegates to the SDK with the channel filter
  */
  it('should list consumers scoped to the channel', async () => {
    mockGetConsumerList.mockResolvedValue([]);

    await channel.getConsumerList();

    expect(mockGetConsumerList).toHaveBeenCalledWith('/schema/user/updates');
  });
});
