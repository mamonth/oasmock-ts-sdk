/**
 * Path suffix appended to the base URL to reach the mock server endpoints.
 */
export const MOCK_PATH_SUFFIX = '/_mock';

/**
 * Condition types supported in mock request conditions.
 */
export const VALID_CONDITION_TYPES = [
  'path',
  'query',
  'header',
  'cookie',
  'body',
  'state',
  'env',
] as const;

export type ConditionType = (typeof VALID_CONDITION_TYPES)[number];

/**
 * Prefixes used to build runtime-expression condition keys.
 */
export const CONDITION_KEY_PREFIXES = {
  REQUEST: '{$request.',
  STATE: '{$state.',
  ENV: '{$env.',
} as const;

/**
 * Default timeouts used by integration test tooling (milliseconds).
 */
export const DEFAULT_TIMEOUTS = {
  INTEGRATION_TEST: 30000,
  INTEGRATION_HOOK: 30000,
  SERVER_START: 15000,
  SERVER_STOP: 5000,
  SERVER_TERM_GRACE: 2000,
} as const;

/**
 * Shared values used by integration tests and test helpers.
 */
export const TEST_CONSTANTS = {
  DEFAULT_OASMOCK_PORT: 19191,
  OASMOCK_CLI_SUBCOMMAND: 'mock' as const,
  OASMOCK_CLI_FLAGS: {
    FROM: '--from',
    PORT: '--port',
    VERBOSE: '--verbose',
  } as const,
  API_SPEC_PATH: './test/_shared/resources/test-api.yaml',
} as const;
