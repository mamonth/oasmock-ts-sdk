/*
Scenario: Management stream lifecycle and envelope dispatch
Given a ManagementStream with an injected WebSocket factory
When handlers subscribe/unsubscribe and envelopes arrive
Then the socket connects lazily, dispatches to matching handlers, and closes when idle
*/

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ManagementStream } from './mock-sdk-stream';
import type { WebSocketLike } from './types';

class FakeSocket implements WebSocketLike {
  readonly url: string;
  closed = false;
  private readonly listeners = new Map<string, Set<(event: unknown) => void>>();

  constructor(url: string) {
    this.url = url;
  }

  addEventListener(type: string, listener: (event: unknown) => void): void {
    const set = this.listeners.get(type) ?? new Set();
    set.add(listener);
    this.listeners.set(type, set);
  }

  emit(type: string, event: unknown): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event);
    }
  }

  close(): void {
    this.closed = true;
  }
}

describe('ManagementStream', () => {
  const sockets: FakeSocket[] = [];
  let stream: ManagementStream;

  beforeEach(() => {
    sockets.length = 0;
    stream = new ManagementStream('ws://localhost:19191/_mock/stream', (url) => {
      const socket = new FakeSocket(url);
      sockets.push(socket);
      return socket;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /*
  Scenario: Opening the socket lazily on first subscription
  Given no subscriptions
  When an event handler is subscribed
  Then a socket opens with the event-name glob filter
  */
  it('should open lazily with event glob filter', () => {
    stream.onEventName('user.created', () => {});

    expect(sockets).toHaveLength(1);
    expect(sockets[0]).toBeDefined();
    expect(sockets[0].url).toBe('ws://localhost:19191/_mock/stream?events=user.created');
  });

  /*
  Scenario: Dispatching matching event envelopes
  Given a subscription to 'user.created'
  When an event envelope with that name arrives
  Then the handler is invoked
  */
  it('should dispatch matching event envelopes', () => {
    const handler = vi.fn();
    stream.onEventName('user.created', handler);

    const socket = sockets[0];
    socket.emit('message', {
      data: JSON.stringify({ type: 'event', ts: 1, event: { name: 'user.created' } }),
    });

    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ type: 'event' }));
  });

  /*
  Scenario: Filtering out non-matching event envelopes
  Given a subscription to 'user.created'
  When another event envelope arrives
  Then the handler is not invoked
  */
  it('should not dispatch non-matching event names', () => {
    const handler = vi.fn();
    stream.onEventName('user.created', handler);

    sockets[0].emit('message', {
      data: JSON.stringify({ type: 'event', event: { name: 'user.other' } }),
    });

    expect(handler).not.toHaveBeenCalled();
  });

  /*
  Scenario: Wildcard event subscription
  Given a subscription to ANY
  When any event envelope arrives
  Then the handler is invoked and the socket has no events filter
  */
  it('should dispatch all events for ANY', () => {
    const handler = vi.fn();
    stream.onEventName('*', handler);

    expect(sockets[0].url).toBe('ws://localhost:19191/_mock/stream');

    sockets[0].emit('message', {
      data: JSON.stringify({ type: 'event', event: { name: 'anything' } }),
    });

    expect(handler).toHaveBeenCalled();
  });

  /*
  Scenario: Glob matching in event subscription
  Given a subscription to 'user.*'
  When an event with matching prefix arrives
  Then the handler is invoked
  */
  it('should support glob event names', () => {
    const handler = vi.fn();
    stream.onEventName('user.*', handler);

    sockets[0].emit('message', {
      data: JSON.stringify({ type: 'event', event: { name: 'user.created' } }),
    });

    expect(handler).toHaveBeenCalled();
  });

  /*
  Scenario: Dispatching type-based envelopes
  Given a push type subscription
  When a push envelope and an event envelope arrive
  Then only the push handler is invoked
  */
  it('should dispatch type envelope subscriptions', () => {
    const pushHandler = vi.fn();
    stream.onEnvelopeType('push', pushHandler);

    sockets[0].emit('message', {
      data: JSON.stringify({ type: 'push', push: { channel: 'c' } }),
    });
    sockets[0].emit('message', {
      data: JSON.stringify({ type: 'event', event: { name: 'x' } }),
    });

    expect(pushHandler).toHaveBeenCalledTimes(1);
  });

  /*
  Scenario: Closing the socket when the last handler is removed
  Given an active event subscription
  When the unsubscribe function is invoked
  Then the socket is closed
  */
  it('should close when last handler unsubscribes', () => {
    const off = stream.onEventName('user.created', () => {});
    const socket = sockets[0];

    off();

    expect(socket.closed).toBe(true);
  });

  /*
  Scenario: Reconnecting when event globs change
  Given an open socket filtered to 'user.created'
  When a new event name is subscribed
  Then the socket is reopened with the union glob
  */
  it('should reconnect when globs change', () => {
    stream.onEventName('user.created', () => {});
    const first = sockets[0];

    stream.onEventName('user.updated', () => {});

    expect(sockets).toHaveLength(2);
    expect(first.closed).toBe(true);
    expect(sockets[1].url).toBe(
      'ws://localhost:19191/_mock/stream?events=user.created,user.updated'
    );
  });

  /*
  Scenario: Reconnecting after an unexpected close
  Given an open subscription
  When the socket closes unexpectedly
  Then a new socket opens after the reconnect delay
  */
  it('should reconnect after unexpected close', () => {
    vi.useFakeTimers();
    stream.onEventName('user.created', () => {});
    const first = sockets[0];

    first.emit('close', {});

    expect(sockets).toHaveLength(1);

    vi.advanceTimersByTime(500);

    expect(sockets).toHaveLength(2);
    expect(sockets[1].url).toContain('events=user.created');
  });

  /*
  Scenario: Ignoring malformed envelopes
  Given an active subscription
  When a non-JSON message arrives
  Then handlers are not invoked
  */
  it('should ignore malformed messages', () => {
    const handler = vi.fn();
    stream.onEventName('user.created', handler);

    sockets[0].emit('message', { data: 'not-json' });

    expect(handler).not.toHaveBeenCalled();
  });
});
