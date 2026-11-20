import { safeExec } from '../utils/exec.js';

/**
 * macOS platform adapter.
 * Uses `lsof` with `-F pcufn` for high-fidelity, un-truncated port scanning.
 */
export class MacOSAdapter {
  constructor(execFn = safeExec) {
    this.exec = execFn;
  }

  /**
   * Scans for TCP listening ports.
   * @param {number} [portFilter]
   * @returns {Promise<Array<{ port: number, protocol: string, pid: number|null, processName: string, address: string, user: string|null, status: string }>>}
   */
  async scan(portFilter) {
    const args = ['-iTCP', '-sTCP:LISTEN', '-n', '-P', '-F', 'pcufn'];
    if (portFilter) {
      args[0] = `-iTCP:${portFilter}`;
    }

    const { stdout, error } = await this.exec('lsof', args);

    if (error && error.code === 'ENOENT') {
      throw new Error('System utility "lsof" was not found on this macOS system.');
    }

    // exitCode 1 with empty stdout simply means no listening ports found
    if (!stdout || stdout.trim().length === 0) {
      return [];
    }

    return this.parseLsofFieldOutput(stdout);
  }

  /**
   * Parses machine-readable lsof -F output.
   * Format:
   * p<pid>
   * c<command>
   * u<uid>
   * f<fd>
   * n<address>:<port>
   * @param {string} text
   */
  parseLsofFieldOutput(text) {
    const records = [];
    const lines = text.split('\n');

    let currentPid = null;
    let currentCommand = 'unknown';
    let currentUser = null;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      const tag = line[0];
      const val = line.slice(1);

      if (tag === 'p') {
        currentPid = parseInt(val, 10) || null;
      } else if (tag === 'c') {
        currentCommand = val;
      } else if (tag === 'u') {
        currentUser = val;
      } else if (tag === 'n') {
        // e.g. *:3000, 127.0.0.1:3000, [::1]:3000, [::]:8080
        const lastColon = val.lastIndexOf(':');
        if (lastColon === -1) continue;

        const portStr = val.slice(lastColon + 1);
        const parsedPort = parseInt(portStr, 10);
        if (isNaN(parsedPort)) continue;

        let address = val.slice(0, lastColon);
        if (address.startsWith('[') && address.endsWith(']')) {
          address = address.slice(1, -1);
        }

        records.push({
          port: parsedPort,
          protocol: 'TCP',
          pid: currentPid,
          processName: currentCommand,
          address: address || '*',
          user: currentUser,
          status: 'LISTENING'
        });
      }
    }

    return records;
  }

  /**
   * Inspects detailed process metadata using ps.
   * @param {number} pid
   * @returns {Promise<{ pid: number, ppid: number|null, user: string|null, commandLine: string, executable: string }>}
   */
  async inspectProcess(pid) {
    const { stdout, exitCode } = await this.exec('ps', ['-ww', '-p', String(pid), '-o', 'pid=,ppid=,user=,command=']);

    if (exitCode !== 0 || !stdout.trim()) {
      return {
        pid,
        ppid: null,
        user: null,
        commandLine: '',
        executable: ''
      };
    }

    const trimmed = stdout.trim();
    const parts = trimmed.split(/\s+/);
    const parsedPid = parseInt(parts[0], 10) || pid;
    const ppid = parseInt(parts[1], 10) || null;
    const user = parts[2] || null;
    const commandLine = parts.slice(3).join(' ');
    const executable = parts[3] || '';

    return {
      pid: parsedPid,
      ppid,
      user,
      commandLine,
      executable
    };
  }

  /**
   * Sends termination signal to process.
   * @param {number} pid
   * @param {string} signal - 'SIGTERM' or 'SIGKILL'
   */
  async terminate(pid, signal = 'SIGTERM') {
    try {
      process.kill(pid, signal);
      return { success: true };
    } catch (err) {
      if (err.code === 'ESRCH') {
        // Process already terminated
        return { success: true, alreadyExited: true };
      }
      return {
        success: false,
        error: err.code === 'EPERM'
          ? `Permission denied when sending ${signal} to PID ${pid}. Try running with sudo.`
          : err.message
      };
    }
  }

  /**
   * Checks whether a process is still running.
   * @param {number} pid
   * @returns {boolean}
   */
  isAlive(pid) {
    try {
      process.kill(pid, 0);
      return true;
    } catch (err) {
      return err.code === 'EPERM'; // If permission denied, the process is alive
    }
  }
}
