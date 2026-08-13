import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  input: './node_modules/oasmock/api/openapi.yaml',
  output: './src/client/generated',
  client: 'fetch',
  exportSchemas: false,
  exportServices: true,
  exportModels: true,
  useOptions: true,
  useUnionTypes: true,
  name: 'OASMockClient',
  httpClient: {
    request: {
      baseUrl: '{$env.BASE_URL}',
    },
  },
});
