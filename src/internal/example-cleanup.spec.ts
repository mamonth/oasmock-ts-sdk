/*
Scenario: Resolving and running bounded example cleanup
Given cleanup options and a set of example IDs
When limits are resolved and deletions are attempted
Then defaults, validation, batching, timeout, and failure reporting are honored
*/

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IClearExamplesOptions } from '../types';
import { cleanupExamples, resolveCleanupPlan } from './example-cleanup';

const { mockParseDurationToMs } = vi.hoisted(() => ({
  mockParseDurationToMs: vi.fn(),
}));

vi.mock('./duration', () => ({
  parseDurationToMs: mockParseDurationToMs,
}));

describe('resolveCleanupPlan', () => {
  beforeEach(() => {
    mockParseDurationToMs.mockReset();
    mockParseDurationToMs.mockImplementation((value: number | string) => {
      if (value === 'soon') {
        throw new Error('Invalid duration: soon');
      }
      if (value === '0ms') {
        return 0;
      }
      if (value === '1s') {
        return 1000;
      }
      return typeof value === 'number' ? value : Number(value);
    });
  });

  /*
  Scenario: Applying cleanup defaults
  Given no options
  When resolveCleanupPlan runs
  Then the documented defaults are returned without parsing a timeout
  */
  it('should apply defaults', () => {
    expect(resolveCleanupPlan()).toEqual({ concurrency: 8, timeoutMs: 30000 });
    expect(mockParseDurationToMs).not.toHaveBeenCalled();
  });

  /*
  Scenario: Accepting a numeric timeout
  Given a numeric timeout option
  When resolveCleanupPlan runs
  Then the timeout is parsed through the duration helper
  */
  it('should accept a numeric timeout', () => {
    expect(resolveCleanupPlan({ concurrency: 2, timeout: 50 })).toEqual({
      concurrency: 2,
      timeoutMs: 50,
    });
    expect(mockParseDurationToMs).toHaveBeenCalledWith(50);
  });

  /*
  Scenario: Accepting a duration-string timeout
  Given a duration-string timeout option
  When resolveCleanupPlan runs
  Then the helper result is used as the timeout
  */
  it('should accept a duration string', () => {
    expect(resolveCleanupPlan({ timeout: '1s' })).toEqual({
      concurrency: 8,
      timeoutMs: 1000,
    });
    expect(mockParseDurationToMs).toHaveBeenCalledWith('1s');
  });

  /*
  Scenario: Rejecting invalid cleanup options
  Given non-positive, fractional, or malformed values
  When resolveCleanupPlan runs
  Then it throws a descriptive error
  */
  it.each<[string, IClearExamplesOptions, string]>([
    ['zero concurrency', { concurrency: 0 }, 'concurrency must be a positive integer'],
    ['fractional concurrency', { concurrency: 1.5 }, 'concurrency must be a positive integer'],
    ['zero timeout', { timeout: 0 }, 'timeout must be a positive integer'],
    ['zero duration', { timeout: '0ms' }, 'timeout must be a positive integer'],
    ['malformed duration', { timeout: 'soon' }, 'Invalid duration: soon'],
  ])('should reject %s', (_name, options, message) => {
    expect(() => resolveCleanupPlan(options)).toThrow(message);
  });
});

describe('cleanupExamples', () => {
  /*
  Scenario: Reporting every attempt without rejecting
  Given one deletable and one failing ID
  When cleanupExamples runs
  Then every attempt is made and the failure is returned with its ID
  */
  it('should report failures after all attempts', async () => {
    const deleteExample = vi.fn(async (id: string) => {
      if (id === 'bad') {
        throw new Error('boom');
      }
    });

    const outcome = await cleanupExamples(['ok', 'bad'], deleteExample, {
      concurrency: 2,
      timeoutMs: 1000,
    });

    expect(outcome.deleted).toEqual(['ok']);
    expect(outcome.failures).toEqual([{ id: 'bad', error: expect.any(Error) }]);
    expect(outcome.failures[0]?.error.message).toBe('boom');
    expect(deleteExample).toHaveBeenCalledTimes(2);
  });

  /*
  Scenario: Enforcing a hard timeout when the transport ignores aborts
  Given a delete that never resolves and ignores the signal
  When cleanupExamples runs with a short timeout
  Then the attempt fails instead of hanging
  */
  it('should time out even when the transport ignores the signal', async () => {
    const deleteExample = vi.fn(() => new Promise<void>(() => {}));

    const outcome = await cleanupExamples(['hung'], deleteExample, {
      concurrency: 1,
      timeoutMs: 10,
    });

    expect(outcome.deleted).toEqual([]);
    expect(outcome.failures[0]?.id).toBe('hung');
    expect(outcome.failures[0]?.error.message).toBe(
      'Failed to delete example: hung (timed out after 10ms)'
    );
  });

  /*
  Scenario: Keeping concurrency within the configured limit
  Given three IDs and a concurrency of two
  When cleanupExamples runs
  Then at most two deletes are in flight before the next batch
  */
  it('should respect the concurrency limit', async () => {
    const resolvers: Array<() => void> = [];
    const deleteExample = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolvers.push(resolve);
        })
    );

    const cleanup = cleanupExamples(['a', 'b', 'c'], deleteExample, {
      concurrency: 2,
      timeoutMs: 1000,
    });
    expect(deleteExample).toHaveBeenCalledTimes(2);

    resolvers[0]?.();
    resolvers[1]?.();
    await vi.waitFor(() => expect(deleteExample).toHaveBeenCalledTimes(3));

    resolvers[2]?.();
    const outcome = await cleanup;

    expect(outcome.deleted).toEqual(['a', 'b', 'c']);
    expect(outcome.failures).toEqual([]);
  });
});
