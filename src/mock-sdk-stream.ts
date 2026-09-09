import type {
  IConsumerEnvelope,
  IEventEnvelope,
  IManageEnvelope,
  IPushEnvelope,
  IScheduleEnvelope,
  TStreamHostType,
  TWebSocketFactory,
  Unsubscribe,
  WebSocketLike,
} from './types';

type Handler = (envelope: IManageEnvelope) => void;

const RECONNECT_DELAY_MS = 500;
const ANY = '*';

/**
 * Lazily connected management notification stream (GET /_mock/stream).
 *
 * The socket opens on the first subscription and closes when the last handler
 * is removed. Connect-time `events` filter globs are derived from active
 * event-name subscriptions and the socket is reconnected when they change.
 * All envelopes are additionally filtered client-side so selectors are exact.
 */
export class ManagementStream {
  private socket?: WebSocketLike;
  private readonly eventHandlers = new Map<string, Set<Handler>>();
  private readonly typeHandlers = new Map<TStreamHostType, Set<Handler>>();
  private desired?: string;
  private reconnectTimer?: ReturnType<typeof setTimeout>;

  constructor(
    private readonly url: string,
    private readonly wsFactory: TWebSocketFactory
  ) {}

  /**
   * Subscribes to `event` envelopes whose name matches `name` (ANY for all).
   */
  onEventName(name: string, handler: (envelope: IEventEnvelope) => void): Unsubscribe {
    const normalized = name || ANY;
    this.addHandler(this.eventHandlers, normalized, handler as Handler);
    this.sync();
    return () => {
      this.removeHandler(this.eventHandlers, normalized, handler as Handler);
      this.sync();
    };
  }

  /**
   * Subscribes to push/consumer/schedule envelopes of the given type.
   */
  onEnvelopeType(
    type: TStreamHostType,
    handler: (envelope: IPushEnvelope | IConsumerEnvelope | IScheduleEnvelope) => void
  ): Unsubscribe {
    this.addHandler(this.typeHandlers, type, handler as Handler);
    this.sync();
    return () => {
      this.removeHandler(this.typeHandlers, type, handler as Handler);
      this.sync();
    };
  }

  private addHandler(handlers: Map<string, Set<Handler>>, key: string, handler: Handler): void {
    const set = handlers.get(key) ?? new Set();
    set.add(handler);
    handlers.set(key, set);
  }

  private removeHandler(handlers: Map<string, Set<Handler>>, key: string, handler: Handler): void {
    const set = handlers.get(key);
    if (!set) return;
    set.delete(handler);
    if (set.size === 0) {
      handlers.delete(key);
    }
  }

  private hasHandlers(): boolean {
    return this.eventHandlers.size > 0 || this.typeHandlers.size > 0;
  }

  /**
   * Builds the connect-time `events` glob (comma-joined event names) from the
   * active subscriptions. ANY means "receive everything" (no filter).
   */
  private computeEventGlobs(): string | undefined {
    if (this.eventHandlers.has(ANY)) return undefined;
    const names = [...this.eventHandlers.keys()];
    return names.length > 0 ? names.join(',') : undefined;
  }

  /**
   * Ensures the socket matches the desired state: closed when idle, otherwise
   * connected with the correct event globs.
   */
  private sync(): void {
    const desired = this.computeEventGlobs();

    if (!this.hasHandlers()) {
      this.disconnect();
      return;
    }

    if (this.socket && this.desired === desired) {
      return;
    }

    this.disconnect();
    this.connect(desired);
  }

  private connect(globs: string | undefined): void {
    this.desired = globs;
    const socket = this.wsFactory(this.buildUrl(globs));
    this.socket = socket;

    socket.addEventListener('open', () => {});
    socket.addEventListener('message', (event: unknown) => {
      this.dispatch(this.parse(event));
    });
    socket.addEventListener('close', () => {
      this.socket = undefined;
      if (this.hasHandlers()) {
        this.scheduleReconnect();
      }
    });
    socket.addEventListener('error', () => {});
  }

  private buildUrl(globs: string | undefined): string {
    if (globs === undefined) return this.url;
    const encoded = globs.split(',').map(encodeURIComponent).join(',');
    return `${this.url}?events=${encoded}`;
  }

  /**
   * Reconnects after an unexpected close while handlers remain.
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      if (this.hasHandlers() && !this.socket) {
        this.connect(this.desired);
      }
    }, RECONNECT_DELAY_MS);
  }

  /**
   * Closes the current socket (if any) and stops pending reconnects.
   */
  private disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    this.socket?.close();
    this.socket = undefined;
  }

  private parse(event: unknown): IManageEnvelope | undefined {
    const data = (event as { data?: unknown } | null)?.data;
    if (typeof data !== 'string') return undefined;
    try {
      return JSON.parse(data) as IManageEnvelope;
    } catch {
      return undefined;
    }
  }

  private dispatch(envelope: IManageEnvelope | undefined): void {
    if (!envelope) return;

    if (envelope.type === 'event') {
      const name = envelope.event?.name ?? '';
      for (const [pattern, handlers] of this.eventHandlers) {
        if (pattern === ANY || matchGlob(pattern, name)) {
          for (const handler of handlers) handler(envelope);
        }
      }
      return;
    }

    const handlers = this.typeHandlers.get(envelope.type);
    if (!handlers) return;
    for (const handler of handlers) handler(envelope);
  }
}

/**
 * Matches a value against a glob pattern where '*' matches any sequence.
 */
function matchGlob(pattern: string, value: string): boolean {
  const regex = new RegExp(
    `^${pattern
      .split('*')
      .map((segment) => segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('.*')}$`
  );
  return regex.test(value);
}
