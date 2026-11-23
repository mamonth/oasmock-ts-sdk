/*
Scenario: Normalizing base URL for OASMock server
Given a base URL with or without trailing slash
When normalizeBaseUrl is called
Then returns URL with /_mock suffix and no duplicate slashes
*/

import { describe, expect, it } from 'vitest';
import { normalizeBaseUrl } from './url';

describe('normalizeBaseUrl', () => {
  /*
  Scenario: Normalizing URL without trailing slash
  Given base URL http://localhost:19191
  When normalizeBaseUrl is called
  Then returns http://localhost:19191/_mock
  */
  it('should add suffix to URL without trailing slash', () => {
    expect(normalizeBaseUrl('http://localhost:19191')).toBe('http://localhost:19191/_mock');
  });

  /*
  Scenario: Normalizing URL with trailing slash
  Given base URL http://localhost:19191/
  When normalizeBaseUrl is called
  Then returns http://localhost:19191/_mock (removes extra slash)
  */
  it('should handle URL with trailing slash', () => {
    expect(normalizeBaseUrl('http://localhost:19191/')).toBe('http://localhost:19191/_mock');
  });

  /*
  Scenario: Normalizing URL with multiple trailing slashes
  Given base URL http://localhost:19191//
  When normalizeBaseUrl is called
  Then returns http://localhost:19191/_mock (removes all extra slashes)
  */
  it('should handle URL with multiple trailing slashes', () => {
    expect(normalizeBaseUrl('http://localhost:19191//')).toBe('http://localhost:19191/_mock');
  });

  /*
  Scenario: Normalizing URL with path segments
  Given base URL http://example.com/api
  When normalizeBaseUrl is called
  Then returns http://example.com/api/_mock
  */
  it('should preserve path segments before adding suffix', () => {
    expect(normalizeBaseUrl('http://example.com/api')).toBe('http://example.com/api/_mock');
  });
});
