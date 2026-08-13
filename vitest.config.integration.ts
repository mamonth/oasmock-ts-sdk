import { defineConfig } from 'vitest/config';
import { DEFAULT_TIMEOUTS } from './src/constants';
import baseConfig from './vitest.config';

export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    include: ['test/**/*.test.ts'],
    exclude: [...(baseConfig.test?.exclude ?? []), '**/*.spec.ts'],
    testTimeout: DEFAULT_TIMEOUTS.INTEGRATION_TEST,
    hookTimeout: DEFAULT_TIMEOUTS.INTEGRATION_HOOK,
  },
});
