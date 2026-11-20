import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/**
 * Safely executes a binary file without shell interpolation.
 *
 * @param {string} file - Path or binary name (e.g. 'lsof', 'ss', 'ps')
 * @param {string[]} args - Command arguments array
 * @param {object} [options] - Additional options
 * @param {number} [options.timeout=5000] - Timeout in milliseconds
 * @returns {Promise<{ stdout: string, stderr: string, exitCode: number }>}
 */
export async function safeExec(file, args = [], options = {}) {
  const timeout = options.timeout ?? 5000;
  const maxBuffer = options.maxBuffer ?? 10 * 1024 * 1024; // 10MB

  try {
    const result = await execFileAsync(file, args, {
      timeout,
      maxBuffer,
      windowsHide: true,
      ...options
    });

    return {
      stdout: result.stdout ? result.stdout.toString() : '',
      stderr: result.stderr ? result.stderr.toString() : '',
      exitCode: 0
    };
  } catch (error) {
    // When a process exits with non-zero or times out
    return {
      stdout: error.stdout ? error.stdout.toString() : '',
      stderr: error.stderr ? error.stderr.toString() : (error.message || ''),
      exitCode: error.code ?? 1,
      error
    };
  }
}
