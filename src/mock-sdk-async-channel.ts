import { parseDurationToMs } from './internal/duration';
import type { MockSDK } from './mock-sdk';
import { MockSDKAsyncEventExample, MockSDKAsyncExample } from './mock-sdk-async-example';
import type {
  IAsyncChannel,
  IConsumer,
  IFireEventOptions,
  TAsyncProtocol,
  TDuration,
} from './types';

/**
 * Facade bound to an AsyncAPI channel address (prefix included). Created via
 * MockSDK.asyncChannel(). Stateless: every call hits the server.
 */
export class MockSDKAsyncChannel implements IAsyncChannel {
  constructor(
    private readonly sdk: MockSDK,
    readonly channel: string,
    readonly protocol: TAsyncProtocol
  ) {}

  /**
   * Starts an event-driven example for the given event name (or a built-in
   * trigger). Returns a builder; finish with .push()/.pushOnce().
   */
  onEvent(event: string): MockSDKAsyncEventExample {
    return new MockSDKAsyncEventExample(this.sdk, this.channel, this.protocol, {
      kind: 'event',
      name: event,
    });
  }

  /**
   * Starts a periodically driven example that emits every `timer`.
   */
  onInterval(timer: TDuration): MockSDKAsyncExample {
    return new MockSDKAsyncExample(this.sdk, this.channel, this.protocol, {
      kind: 'interval',
      interval: parseDurationToMs(timer),
    });
  }

  /**
   * Instantly pushes a message to all consumers of this channel.
   */
  push(payload: unknown): Promise<void> {
    return this.sdk.pushToChannel(this.channel, { payload });
  }

  /**
   * Fires a named event (same as MockSDK.fireEvent).
   */
  fireEvent(name: string, opts: IFireEventOptions = {}): Promise<void> {
    return this.sdk.fireEvent(name, opts);
  }

  /**
   * Lists the currently connected consumers of this channel.
   */
  getConsumerList(): Promise<IConsumer[]> {
    return this.sdk.getConsumerList(this.channel);
  }
}
