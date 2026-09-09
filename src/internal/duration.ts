import type { TDuration } from '../types';

const DURATION_PATTERN = /^(\d+(?:\.\d+)?)\s*(ms|s|m|h|d)$/;

function unitToMs(unit: string): number {
  switch (unit) {
    case 'ms':
      return 1;
    case 's':
      return 1000;
    case 'm':
      return 60000;
    case 'h':
      return 3600000;
    case 'd':
      return 86400000;
    default:
      throw new Error(`Unsupported duration unit: ${unit}`);
  }
}

/**
 * Converts a TDuration into milliseconds. Numbers are treated as milliseconds
 * (the server-native unit for delay/interval); strings are parsed by unit.
 */
export function parseDurationToMs(value: TDuration): number {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`Invalid duration: ${value}. Must be a non-negative number of milliseconds`);
    }
    return value;
  }

  const match = value.match(DURATION_PATTERN);
  if (!match) {
    throw new Error(`Invalid duration: ${value}. Expected format like '500ms', '1s', '2m', '1h'`);
  }

  const amount = parseFloat(match[1] as string);
  const unit = match[2] as string;
  return amount * unitToMs(unit);
}

/**
 * Converts a TDuration into seconds. Numbers are treated as seconds
 * (the server-native unit for ttl); strings are parsed by unit.
 */
export function parseDurationToSeconds(value: TDuration): number {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`Invalid duration: ${value}. Must be a non-negative number of seconds`);
    }
    return value;
  }

  return parseDurationToMs(value) / 1000;
}

/**
 * Resolves a TDuration to a non-negative integer number of seconds (ttl).
 * Throws for durations that are not whole seconds.
 */
export function resolveTtlSeconds(value: TDuration): number {
  const seconds = parseDurationToSeconds(value);
  if (!Number.isInteger(seconds)) {
    throw new Error('ttl must be a whole number of seconds');
  }
  return seconds;
}
