import { getPlatformAdapter } from '../platform/index.js';
import { scanPorts } from './scanner.js';
import { assertSafeToTerminate } from './safety.js';
import { validatePort, validatePid } from '../utils/validation.js';

/**
 * Inspects the process occupying a specific port.
 *
 * @param {number|string} port
 * @param {object} [options]
 * @param {object} [options.adapter]
 * @returns {Promise<object|null>} Process and socket details, or null if port is free
 */
export async function inspectPort(port, options = {}) {
  const validPort = validatePort(port);
  const adapter = options.adapter || getPlatformAdapter();

  const results = await scanPorts({ port: validPort, adapter });
  if (results.length === 0) {
    return null;
  }

  const record = results[0];

  if (!record.pid) {
    return {
      ...record,
      executable: '',
      commandLine: '',
      ppid: null,
      permissionRestricted: true
    };
  }

  const meta = await adapter.inspectProcess(record.pid);

  return {
    ...record,
    executable: meta.executable || '',
    commandLine: meta.commandLine || '',
    ppid: meta.ppid || null,
    user: meta.user || record.user || null,
    permissionRestricted: false
  };
}

/**
 * Safely terminates a process with verification and timeout.
 *
 * @param {number} pid
 * @param {object} [options]
 * @param {string} [options.signal='SIGTERM'] - 'SIGTERM' or 'SIGKILL'
 * @param {string} [options.processName] - Process name to verify against safety list
 * @param {number} [options.timeout=2500] - Milliseconds to wait for exit
 * @param {object} [options.adapter]
 * @returns {Promise<{ success: boolean, exited: boolean, error?: string }>}
 */
export async function terminateProcess(pid, options = {}) {
  const validPid = validatePid(pid);
  const signal = options.signal || 'SIGTERM';
  const adapter = options.adapter || getPlatformAdapter();
  const timeout = options.timeout ?? 2500;

  // Run safety validation before anything
  assertSafeToTerminate({ pid: validPid, processName: options.processName });

  // Initial alive check
  if (!adapter.isAlive(validPid)) {
    return { success: true, exited: true };
  }

  const termResult = await adapter.terminate(validPid, signal);
  if (!termResult.success) {
    return { success: false, exited: false, error: termResult.error };
  }

  // Poll for exit verification
  const startTime = Date.now();
  const pollInterval = 100;

  while (Date.now() - startTime < timeout) {
    if (!adapter.isAlive(validPid)) {
      return { success: true, exited: true };
    }
    await new Promise(r => setTimeout(r, pollInterval));
  }

  // If still alive after timeout
  const stillAlive = adapter.isAlive(validPid);
  return {
    success: !stillAlive,
    exited: !stillAlive,
    error: stillAlive ? `Process PID ${validPid} did not exit within ${timeout}ms.` : undefined
  };
}
