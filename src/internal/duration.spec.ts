/*
Scenario: Parsing TDuration values into milliseconds and seconds
Given duration strings and numbers
When parseDurationToMs/parseDurationToSeconds/resolveTtlSeconds are called
Then convert with correct units or throw for invalid input
*/

import { describe, expect, it } from 'vitest';
import { parseDurationToMs, parseDurationToSeconds, resolveTtlSeconds } from './duration';

describe('parseDurationToMs', () => {
  /*
  Scenario: Parsing millisecond strings
  Given a string like '500ms'
  When parseDurationToMs is called
  Then returns 500
  */
  it('should parse millisecond strings', () => {
    expect(parseDurationToMs('500ms')).toBe(500);
  });

  /*
  Scenario: Parsing second strings
  Given a string like '1s'
  When parseDurationToMs is called
  Then returns 1000
  */
  it('should parse second strings', () => {
    expect(parseDurationToMs('1s')).toBe(1000);
  });

  /*
  Scenario: Parsing larger unit strings
  Given strings like '2m', '1h', '1d'
  When parseDurationToMs is called
  Then returns the milliseconds equivalent
  */
  it('should parse minutes, hours, and days', () => {
    expect(parseDurationToMs('2m')).toBe(120000);
    expect(parseDurationToMs('1h')).toBe(3600000);
    expect(parseDurationToMs('1d')).toBe(86400000);
  });

  /*
  Scenario: Treating numbers as milliseconds
  Given a number
  When parseDurationToMs is called
  Then returns the number unchanged
  */
  it('should treat numbers as milliseconds', () => {
    expect(parseDurationToMs(2500)).toBe(2500);
  });

  /*
  Scenario: Rejecting invalid strings
  Given a non-duration string
  When parseDurationToMs is called
  Then throws an informative error
  */
  it('should throw for invalid strings', () => {
    expect(() => parseDurationToMs('soon')).toThrow('Invalid duration: soon');
  });

  /*
  Scenario: Rejecting negative numbers
  Given a negative number
  When parseDurationToMs is called
  Then throws
  */
  it('should throw for negative numbers', () => {
    expect(() => parseDurationToMs(-1)).toThrow('Invalid duration: -1');
  });
});

describe('parseDurationToSeconds', () => {
  /*
  Scenario: Parsing a second string to seconds
  Given a string like '10s'
  When parseDurationToSeconds is called
  Then returns 10
  */
  it('should parse second strings', () => {
    expect(parseDurationToSeconds('10s')).toBe(10);
  });

  /*
  Scenario: Treating numbers as seconds
  Given a number
  When parseDurationToSeconds is called
  Then returns the number unchanged
  */
  it('should treat numbers as seconds', () => {
    expect(parseDurationToSeconds(60)).toBe(60);
  });
});

describe('resolveTtlSeconds', () => {
  /*
  Scenario: Resolving a valid ttl string
  Given a string like '10s'
  When resolveTtlSeconds is called
  Then returns 10
  */
  it('should resolve whole-second strings', () => {
    expect(resolveTtlSeconds('10s')).toBe(10);
  });

  /*
  Scenario: Resolving a number ttl
  Given a number of seconds
  When resolveTtlSeconds is called
  Then returns the number unchanged
  */
  it('should resolve numeric seconds', () => {
    expect(resolveTtlSeconds(30)).toBe(30);
  });

  /*
  Scenario: Rejecting sub-second ttl
  Given '500ms'
  When resolveTtlSeconds is called
  Then throws because ttl must be whole seconds
  */
  it('should throw for sub-second ttl', () => {
    expect(() => resolveTtlSeconds('500ms')).toThrow('ttl must be a whole number of seconds');
  });
});
