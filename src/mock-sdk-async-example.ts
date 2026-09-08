import { parseDurationToMs, resolveTtlSeconds } from './internal/duration';
import type { MockSDK } from './mock-sdk';
import type {
  IAsyncEventExample,
  IAsyncExample,
  IAsyncPushOptions,
  TAsyncConditions,
  TAsyncProtocol,
  TDuration,
} from './types';

type AsyncTrigger = { kind: 'event'; name?: string } | { kind: 'interval'; interval: number };

/** Sentinel for SDKEvent.ANY: no identity pin, unsupported by the server. */
const ANY_IDENTITY = '*';

function isWildcardIdentity(name: string | undefined): boolean {
  return name === undefined || name === ANY_IDENTITY;
}

/**
 * Base async example builder shared by event- and interval-driven examples.
 * Created via IAsyncChannel.onEvent()/onInterval().
 */
export class MockSDKAsyncExample implements IAsyncExample {
  protected readonly conditions: TAsyncConditions = {};
  protected delay?: number;

  constructor(
    protected readonly sdk: MockSDK,
    protected readonly channel: string,
    protected readonly protocol: TAsyncProtocol,
    protected readonly trigger: AsyncTrigger
  ) {}

  /**
   * Adds match conditions (full runtime-expression keys). Not allowed on
   * interval examples (the server rejects a periodically driven example that
   * declares any match).
   */
  withConditions(conditions: TAsyncConditions): this {
    if (this.trigger.kind === 'interval') {
      throw new Error('Interval examples are single-trigger and cannot have conditions');
    }
    Object.assign(this.conditions, conditions);
    return this;
  }

  /**
   * Registers the example and returns its ID.
   */
  async push(payload: unknown, opts: IAsyncPushOptions = {}): Promise<string> {
    this.assertEventContext();
    return this.sdk.addAsyncExample({
      channel: this.channel,
      protocol: this.protocol,
      conditions: this.toConditions(),
      interval: this.trigger.kind === 'interval' ? this.trigger.interval : undefined,
      delay: this.delay,
      once: opts.once,
      ttl: opts.ttl !== undefined ? resolveTtlSeconds(opts.ttl) : undefined,
      validate: opts.validate,
      payload,
    });
  }

  /**
   * Wildcard identity (SDKEvent.ANY) is not supported by the server runtime
   * API (identities are matched exactly). Guidance: use a concrete event name,
   * or subscribe via sdk.on(SDKEvent.ANY) and push manually.
   */
  private assertEventContext(): void {
    if (this.trigger.kind === 'event' && isWildcardIdentity(this.trigger.name)) {
      throw new Error(
        'SDKEvent.ANY is not supported by the server for event examples; use a concrete event name or subscribe with sdk.on() and push manually'
      );
    }
  }

  /**
   * Merges user conditions with the event identity (when pinned).
   */
  protected toConditions(): TAsyncConditions | undefined {
    const conditions = { ...this.conditions };
    if (this.trigger.kind === 'event' && !isWildcardIdentity(this.trigger.name)) {
      conditions['{$event.name}'] = this.trigger.name as string;
    }
    return Object.keys(conditions).length > 0 ? conditions : undefined;
  }
}

/**
 * Event-driven async example builder with delay and one-shot helpers.
 * Created via IAsyncChannel.onEvent().
 */
export class MockSDKAsyncEventExample extends MockSDKAsyncExample implements IAsyncEventExample {
  /**
   * Delays emission after the event fires.
   */
  withDelay(timer: TDuration): this {
    this.delay = parseDurationToMs(timer);
    return this;
  }

  /**
   * Registers a one-shot event-driven example (removed after first delivery).
   */
  async pushOnce(payload: unknown, opts: Omit<IAsyncPushOptions, 'once'> = {}): Promise<string> {
    return this.push(payload, { ...opts, once: true });
  }
}
