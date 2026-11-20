/**
 * System-critical process names that must never be terminated automatically or accidentally.
 */
export const PROTECTED_SYSTEM_PROCESSES = new Set([
  // POSIX / System Init
  'kernel_task',
  'launchd',
  'init',
  'systemd',
  'kthreadd',
  'syslogd',
  'systemd-journald',
  'systemd-udevd',
  'systemd-resolved',
  'systemd-logind',
  'loginwindow',
  'WindowServer',
  'sshd',
  // Windows System Processes
  'system',
  'system idle process',
  'smss.exe',
  'csrss.exe',
  'wininit.exe',
  'services.exe',
  'lsass.exe',
  'svchost.exe',
  'winlogon.exe'
]);

/**
 * Checks if a given PID is system critical (e.g. 0 or 1).
 * @param {number} pid
 * @returns {boolean}
 */
export function isCriticalPid(pid) {
  return pid === 0 || pid === 1;
}

/**
 * Checks if a process name is considered critical system infrastructure.
 * @param {string} processName
 * @returns {boolean}
 */
export function isProtectedProcess(processName) {
  if (!processName) return false;
  const normalized = processName.trim().toLowerCase();
  const baseName = normalized.split('/').pop().split('\\').pop();
  return PROTECTED_SYSTEM_PROCESSES.has(baseName);
}

/**
 * Asserts whether a process is safe to terminate.
 * @param {object} proc
 * @param {number} proc.pid
 * @param {string} [proc.processName]
 * @throws {Error} If process is protected or critical.
 */
export function assertSafeToTerminate(proc) {
  if (!proc || proc.pid === undefined || proc.pid === null) {
    throw new Error('Invalid process: missing PID.');
  }

  if (isCriticalPid(proc.pid)) {
    throw new Error(`Refusing to terminate PID ${proc.pid}: this is a critical system process.`);
  }

  if (isProtectedProcess(proc.processName)) {
    throw new Error(`Refusing to terminate "${proc.processName}" (PID ${proc.pid}): protected system service.`);
  }
}
