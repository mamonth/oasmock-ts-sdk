import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'OASMockSDK',
      fileName: (format) => (format === 'es' ? 'oasmock-sdk.esm.js' : 'oasmock-sdk.cjs.js'),
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: [],
      output: {
        exports: 'named',
      },
    },
    sourcemap: true,
    target: 'es2022',
    minify: true,
  },
  plugins: [
    dts({
      insertTypesEntry: true,
      exclude: ['**/*.test.ts', '**/*.spec.ts', '**/generated/**'],
    }),
  ],
});
