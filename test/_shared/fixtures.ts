import { type ChildProcess, spawn } from 'node:child_process';
import { access, constants } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_TIMEOUTS, TEST_CONSTANTS } from '../../src/constants';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export interface OASMockServer {
  baseUrl: string;
  process: ChildProcess;
  stop: () => Promise<void>;
}

async function getBinaryPath(): Promise<string> {
  const binaryPath = join(__dirname, '../../node_modules/oasmock/bin/oasmock');

  try {
    await access(binaryPath, constants.X_OK);
    return binaryPath;
  } catch {
    const platform = process.platform === 'win32' ? 'windows' : process.platform;
    const arch = process.arch === 'x64' ? 'amd64' : process.arch;
    const platformBinary = join(
      __dirname,
      `../../node_modules/oasmock/bin/oasmock-${platform}-${arch}`
    );

    try {
      await access(platformBinary, constants.F_OK);
      return platformBinary;
    } catch {
      throw new Error(
        `OASMock binary not found or not executable. Tried:
        - ${binaryPath}
        - ${platformBinary}
        Ensure oasmock package is installed and binary has execute permissions.`
      );
    }
  }
}

export async function startOASMockServer(
  options: { port?: number; apiSpec?: string; prefix?: string } = {}
): Promise<OASMockServer> {
  const port = options.port ?? TEST_CONSTANTS.DEFAULT_OASMOCK_PORT;
  const apiSpec = options.apiSpec ?? join(__dirname, 'resources/test-api.yaml');
  const binaryPath = await getBinaryPath();

  if (process.env.CI) {
    console.log(`Starting OASMock server from: ${binaryPath}`);
  }

  const args = [
    TEST_CONSTANTS.OASMOCK_CLI_SUBCOMMAND,
    TEST_CONSTANTS.OASMOCK_CLI_FLAGS.FROM,
    apiSpec,
    ...(options.prefix !== undefined
      ? [TEST_CONSTANTS.OASMOCK_CLI_FLAGS.PREFIX, options.prefix]
      : []),
    TEST_CONSTANTS.OASMOCK_CLI_FLAGS.PORT,
    port.toString(),
    TEST_CONSTANTS.OASMOCK_CLI_FLAGS.VERBOSE,
  ];

  const childProcess = spawn(binaryPath, args, {
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  let stdout = '';
  let stderr = '';

  childProcess.stdout?.on('data', (data) => {
    stdout += data.toString();
    if (process.env.CI) {
      console.log(`[OASMock stdout] ${data.toString().trim()}`);
    }
  });

  childProcess.stderr?.on('data', (data) => {
    stderr += data.toString();
    if (process.env.CI) {
      console.error(`[OASMock stderr] ${data.toString().trim()}`);
    }
  });

  // Wait for server to be ready (check for listening message)
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error(`Server startup timeout. stdout: ${stdout}, stderr: ${stderr}`));
    }, DEFAULT_TIMEOUTS.SERVER_START);

    const cleanup = () => {
      clearTimeout(timeout);
      childProcess.stdout?.removeAllListeners();
      childProcess.stderr?.removeAllListeners();
    };

    const readyListener = (data: Buffer) => {
      const output = data.toString();
      if (output.includes('Mock server started')) {
        cleanup();
        resolve({
          baseUrl: `http://localhost:${port}`,
          process: childProcess,
          stop: () => stopServer(childProcess),
        });
      }
    };

    childProcess.stdout?.on('data', readyListener);
    childProcess.stderr?.on('data', readyListener);

    childProcess.on('error', (err) => {
      cleanup();
      reject(err);
    });

    childProcess.on('exit', (code) => {
      cleanup();
      reject(new Error(`Server exited with code ${code}. stdout: ${stdout}, stderr: ${stderr}`));
    });
  });
}

async function stopServer(childProcess: ChildProcess): Promise<void> {
  return new Promise((resolve) => {
    childProcess.on('exit', () => resolve());
    childProcess.kill('SIGTERM');

    setTimeout(() => {
      if (!childProcess.killed) {
        childProcess.kill('SIGKILL');
      }
      resolve();
    }, DEFAULT_TIMEOUTS.SERVER_TERM_GRACE);
  });
}
