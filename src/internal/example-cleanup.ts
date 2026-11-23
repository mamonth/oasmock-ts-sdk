import { EXAMPLE_CLEANUP_DEFAULTS } from '../constants';
import type { IClearExamplesOptions, TDuration } from '../types';
import { parseDurationToMs } from './duration';

/**
 * Deletes a single example, honoring the provided abort signal.
 */
export type TDeleteExample = (id: string, signal: AbortSignal) => Promise<void>;

/**
 * Resolved cleanup limits shared by every batch.
 */
export interface ICleanupPlan {
  concurrency: number;
  timeoutMs: number;
}

/**
 * One failed deletion, tagged with the example it belongs to.
 */
export interface ICleanupFailure {
  id: string;
  error: Error;
}

/**
 * Outcome of a cleanup run. Callers decide whether failures are fatal.
 */
export interface ICleanupOutcome {
  deleted: string[];
  failures: ICleanupFailure[];
}

/**
 * Normalizes an arbitrary rejection reason into a human-readable message.
 */
export function errorMessage(reason: unknown): string {
  return reason instanceof Error ? reason.message : String(reason);
}

/**
 * Builds a deletion error that names the example it belongs to.
 */
export function deletionError(exampleId: string, detail: string, cause?: unknown): Error {
  const message = `Failed to delete example: ${exampleId}${detail}`;
  return cause === undefined ? new Error(message) : new Error(message, { cause });
}

/**
 * Normalizes an arbitrary rejection reason into an Error.
 */
function toError(reason: unknown): Error {
  return reason instanceof Error ? reason : new Error(errorMessage(reason));
}

/**
 * Resolves an optional positive-integer value to its default.
 */
function resolvePositiveInteger(value: number | undefined, fallback: number, name: string): number {
  const resolved = value ?? fallback;

  if (!Number.isInteger(resolved) || resolved < 1) {
    throw new Error(`${name} must be a positive integer`);
  }

  return resolved;
}

/**
 * Resolves a duration to a positive integer number of milliseconds.
 */
function resolveTimeout(value: TDuration | undefined): number {
  if (value === undefined) {
    return EXAMPLE_CLEANUP_DEFAULTS.TIMEOUT_MS;
  }

  const timeoutMs = parseDurationToMs(value);

  if (!Number.isInteger(timeoutMs) || timeoutMs < 1) {
    throw new Error('timeout must be a positive integer number of milliseconds');
  }

  return timeoutMs;
}

/**
 * Resolves and validates cleanup options once per cleanup run.
 */
export function resolveCleanupPlan(options: IClearExamplesOptions = {}): ICleanupPlan {
  return {
    concurrency: resolvePositiveInteger(
      options.concurrency,
      EXAMPLE_CLEANUP_DEFAULTS.CONCURRENCY,
      'concurrency'
    ),
    timeoutMs: resolveTimeout(options.timeout),
  };
}

/**
 * Splits items into fixed-size batches.
 */
function chunk<T>(items: readonly T[], size: number): T[][] {
  const batches: T[][] = [];

  for (let start = 0; start < items.length; start += size) {
    batches.push(items.slice(start, start + size));
  }

  return batches;
}

/**
 * Runs one delete with a hard timeout. The timeout rejects independently of
 * the transport so a client that ignores the abort signal cannot hang cleanup.
 */
async function deleteWithTimeout(
  id: string,
  deleteExample: TDeleteExample,
  timeoutMs: number
): Promise<void> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timedOut = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(deletionError(id, ` (timed out after ${timeoutMs}ms)`));
      controller.abort();
    }, timeoutMs);
  });

  try {
    await Promise.race([deleteExample(id, controller.signal), timedOut]);
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  }
}

/**
 * Captures the outcome of one delete without failing the whole batch.
 */
async function attemptDelete(
  id: string,
  deleteExample: TDeleteExample,
  timeoutMs: number
): Promise<{ id: string; error?: Error }> {
  try {
    await deleteWithTimeout(id, deleteExample, timeoutMs);
    return { id };
  } catch (reason) {
    return { id, error: toError(reason) };
  }
}

/**
 * Deletes every given example in bounded concurrent batches.
 * Each attempt settles independently; a 404 is handled by `deleteExample` and
 * failures are returned for the caller to report.
 */
export async function cleanupExamples(
  ids: Iterable<string>,
  deleteExample: TDeleteExample,
  plan: ICleanupPlan
): Promise<ICleanupOutcome> {
  const deleted: string[] = [];
  const failures: ICleanupFailure[] = [];

  for (const batch of chunk([...ids], plan.concurrency)) {
    const attempts = await Promise.all(
      batch.map((id) => attemptDelete(id, deleteExample, plan.timeoutMs))
    );

    for (const { id, error } of attempts) {
      if (error === undefined) {
        deleted.push(id);
      } else {
        failures.push({ id, error });
      }
    }
  }

  return { deleted, failures };
}
