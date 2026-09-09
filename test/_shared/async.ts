import { DEFAULT_TIMEOUTS } from '../../src/constants';

export interface AsyncTestConsumer {
  /** All messages received so far, parsed as JSON. */
  messages(): unknown[];
  /** Waits until a message matches the predicate, returning it. */
  waitForMessage(predicate: (message: unknown) => boolean, timeoutMs?: number): Promise<unknown>;
  /** Resolves when the socket is closed (e.g. after a force-disconnect). */
  waitForClose(timeoutMs?: number): Promise<void>;
  close(): void;
}

/**
 * Connects a WebSocket consumer to an AsyncAPI channel and collects messages.
 * Uses the Node built-in WebSocket (Node 22+).
 */
export async function connectAsyncConsumer(
  baseUrl: string,
  channel: string
): Promise<AsyncTestConsumer> {
  const ws = new WebSocket(`${baseUrl.replace(/^http/, 'ws')}${channel}`);
  await new Promise<void>((resolve, reject) => {
    ws.addEventListener('open', () => resolve());
    ws.addEventListener('error', () => reject(new Error(`Failed to connect to ${channel}`)));
  });

  const messages: unknown[] = [];
  ws.addEventListener('message', (event: unknown) => {
    const data = (event as { data?: unknown }).data;
    if (typeof data === 'string') {
      messages.push(JSON.parse(data));
    }
  });

  const waitForMessage = (
    predicate: (message: unknown) => boolean,
    timeoutMs = DEFAULT_TIMEOUTS.INTEGRATION_TEST
  ): Promise<unknown> => {
    const started = Date.now();
    return new Promise((resolve, reject) => {
      const poll = () => {
        const match = messages.find(predicate);
        if (match !== undefined) {
          resolve(match);
          return;
        }
        if (Date.now() - started > timeoutMs) {
          reject(new Error('Timeout waiting for async message'));
          return;
        }
        setTimeout(poll, 20);
      };
      poll();
    });
  };

  const waitForClose = (timeoutMs = 5000): Promise<void> =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timeout waiting for close')), timeoutMs);
      ws.addEventListener('close', () => {
        clearTimeout(timer);
        resolve();
      });
    });

  return {
    messages: () => messages,
    waitForMessage,
    waitForClose,
    close: () => ws.close(),
  };
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export { sleep };
