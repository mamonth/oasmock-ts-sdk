import type { MockSDK } from './mock-sdk';
import type { IDisconnectOptions } from './types';

type ConsumerProtocol = 'ws' | 'signalr';
type ConsumerStream = { connectionId?: string; invocationId?: string; streamId?: string };

/**
 * A connected async consumer with SDK-backed convenience actions.
 * Returned by MockSDK.getConsumerList()/IAsyncChannel.getConsumerList();
 * reflects the state at the time the list was fetched.
 */
export class MockSDKConsumer {
  readonly connectionId: string;
  readonly channel: string;
  readonly protocol: ConsumerProtocol;
  readonly streams?: ConsumerStream[];
  readonly path?: string;

  constructor(
    private readonly sdk: MockSDK,
    connectionId: string,
    channel: string,
    protocol: ConsumerProtocol = 'ws',
    streams?: ConsumerStream[],
    path?: string
  ) {
    this.connectionId = connectionId;
    this.channel = channel;
    this.protocol = protocol;
    this.streams = streams;
    this.path = path;
  }

  /**
   * Force-disconnects this consumer.
   */
  disconnect(options?: IDisconnectOptions): Promise<void> {
    return this.sdk.disconnectConsumer(this.connectionId, options);
  }

  /**
   * Pushes a message to this consumer only.
   */
  push(payload: unknown): Promise<void> {
    return this.sdk.pushToChannel(this.channel, { connectionId: this.connectionId, payload });
  }
}
