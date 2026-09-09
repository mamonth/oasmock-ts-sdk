/*
Scenario: Published build artifacts are consumable through both ESM and CJS entry points
Given the dist/ directory contains the freshly built package artifacts
When the package is loaded with ESM import() and with CJS require()
Then both module systems expose functional MockSDK and MockSDKRequest exports
*/

import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { DEFAULT_TIMEOUTS } from '../src/constants';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const distDir = join(repoRoot, 'dist');

const ESM_ARTIFACT = join(distDir, 'oasmock-sdk.esm.js');
const CJS_ARTIFACT = join(distDir, 'oasmock-sdk.cjs');

const PUBLIC_EXPORTS = [
  'ManagementStream',
  'MockSDK',
  'MockSDKAsyncChannel',
  'MockSDKAsyncEventExample',
  'MockSDKAsyncExample',
  'MockSDKConsumer',
  'MockSDKRequest',
  'SDKEvent',
];

interface LoadResult {
  keys: string[];
  mockSdkType: string;
  mockSdkRequestType: string;
  canOnRequest: boolean;
}

function runCommand(command: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(command, args, { cwd: repoRoot }, (error, stdout, stderr) => {
      if (error) {
        reject(
          new Error(
            `Command '${command} ${args.join(' ')}' failed: ${error.message}\nstdout: ${stdout}\nstderr: ${stderr}`
          )
        );
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

async function buildIfNeeded(): Promise<void> {
  if (existsSync(ESM_ARTIFACT) && existsSync(CJS_ARTIFACT)) {
    return;
  }
  await runCommand('npm', ['run', 'build']);
  if (!existsSync(ESM_ARTIFACT) || !existsSync(CJS_ARTIFACT)) {
    throw new Error('Build did not produce the expected dist artifacts');
  }
}

function probeScript(loadLine: string): string {
  return [
    loadLine,
    'console.log(JSON.stringify({',
    '  keys: Object.keys(m).sort(),',
    '  mockSdkType: typeof m.MockSDK,',
    '  mockSdkRequestType: typeof m.MockSDKRequest,',
    '  canOnRequest: typeof new m.MockSDK("http://localhost:19191").onRequest === "function",',
    '}));',
  ].join('\n');
}

const ESM_PROBE = probeScript('const m = await import("oasmock-sdk");');
const CJS_PROBE = probeScript('const m = require("oasmock-sdk");');

async function runNodeProbe(args: string[]): Promise<LoadResult> {
  const { stdout, stderr } = await runCommand('node', args);
  try {
    return JSON.parse(stdout.trim()) as LoadResult;
  } catch {
    throw new Error(`Node probe produced invalid output. stdout: ${stdout}, stderr: ${stderr}`);
  }
}

async function loadViaEsm(): Promise<LoadResult> {
  return runNodeProbe(['--input-type=module', '-e', ESM_PROBE]);
}

async function loadViaCjs(): Promise<LoadResult> {
  return runNodeProbe(['-e', CJS_PROBE]);
}

function expectPublicApi(result: LoadResult): void {
  expect(result).toEqual({
    keys: PUBLIC_EXPORTS,
    mockSdkType: 'function',
    mockSdkRequestType: 'function',
    canOnRequest: true,
  });
}

describe('Build artifacts', () => {
  beforeAll(async () => {
    await buildIfNeeded();
  }, DEFAULT_TIMEOUTS.INTEGRATION_HOOK);

  /*
  Scenario: dist contains both published module artifacts
  Given the build has run
  When the dist/ directory is inspected
  Then both the ESM and CJS artifacts are present
  */
  it('should produce ESM and CJS artifacts in dist/', () => {
    expect(existsSync(ESM_ARTIFACT)).toBe(true);
    expect(existsSync(CJS_ARTIFACT)).toBe(true);
  });

  /*
  Scenario: Loading the package through the ESM entry point
  Given the built package
  When it is loaded with ESM import()
  Then it exposes functional MockSDK and MockSDKRequest exports
  */
  it('should expose the public API via ESM import()', async () => {
    const result = await loadViaEsm();
    expectPublicApi(result);
  });

  /*
  Scenario: Loading the package through the CJS entry point
  Given the built package
  When it is loaded with CJS require()
  Then it exposes functional MockSDK and MockSDKRequest exports
  */
  it('should expose the public API via CJS require()', async () => {
    const result = await loadViaCjs();
    expectPublicApi(result);
  });

  /*
  Scenario: ESM and CJS entry points expose the same exports
  Given the built package
  When loaded through both module systems
  Then the export names match exactly
  */
  it('should expose the same export names through both entry points', async () => {
    const [esm, cjs] = await Promise.all([loadViaEsm(), loadViaCjs()]);
    expect(esm.keys).toEqual(cjs.keys);
  });
});
