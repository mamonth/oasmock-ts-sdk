import { MOCK_PATH_SUFFIX } from '../constants';

/**
 * Trims trailing slashes from the base URL and appends the mock server path suffix.
 */
export function normalizeBaseUrl(baseUrl: string): string {
  const normalized = baseUrl.replace(/\/+$/, '');
  return `${normalized}${MOCK_PATH_SUFFIX}`;
}
