import { safeExec } from '../utils/exec.js';

/**
 * Windows platform adapter.
 * Uses `netstat -ano -p tcp` for socket discovery and PowerShell for process metadata.
 */
export class WindowsAdapter {
  constructor(execFn = safeExec) {
    this.exec = execFn;
  }

  /**
   * Scans for TCP listening ports.
   * @param {number} [portFilter]
   */
  async scan(portFilter) {
    const { stdout, exitCode } = await this.exec('netstat', ['-ano', '-p', 'tcp']);

    if (exitCode !== 0 || !stdout) {
      return [];
    }

    const records = this.parseNetstatOutput(stdout, portFilter);

    // Populate process names for distinct PIDs if available
    const uniquePids = [...new Set(records.map(r => r.pid).filter(Boolean))];
    if (uniquePids.length > 0) {
      const pidMap = await this.batchGetProcessNames(uniquePids);
      for (const rec of records) {
        if (rec.pid && pidMap.has(rec.pid)) {
          rec.processName = pidMap.get(rec.pid);
        }
      }
    }

    return records;
  }

  /**
   * Parses output from `netstat -ano -p tcp`.
   * Example:
   *   TCP    0.0.0.0:135            0.0.0.0:0              LISTENING       988
   *   TCP    [::]:135               [::]:0                 LISTENING       988
   */
  parseNetstatOutput(text, portFilter) {
    const records = [];
    const lines = text.split('\n');

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line.startsWith('TCP')) continue;

      const parts = line.split(/\s+/);
      if (parts.length < 5) continue;

      const state = parts[3];
      if (state !== 'LISTENING') continue;

      const localAddr = parts[1];
      const pidStr = parts[4];
      const pid = parseInt(pidStr, 10) || null;

      const lastColon = localAddr.lastIndexOf(':');
      if (lastColon === -1) continue;

      const port = parseInt(localAddr.slice(lastColon + 1), 10);
      if (isNaN(port)) continue;
      if (portFilter && port !== portFilter) continue;

      let address = localAddr.slice(0, lastColon);
      if (address.startsWith('[') && address.endsWith(']')) {
        address = address.slice(1, -1);
      }

      records.push({
        port,
        protocol: 'TCP',
        pid,
        processName: 'unknown',
        address: address || '*',
        user: null,
        status: 'LISTENING'
      });
    }

    return records;
  }

  /**
   * Batch fetches process names for PIDs using tasklist /fo csv.
   * @param {number[]} pids
   * @returns {Promise<Map<number, string>>}
   */
  async batchGetProcessNames(pids) {
    const map = new Map();
    const { stdout } = await this.exec('tasklist', ['/fo', 'csv', '/nh']);
    if (!stdout) return map;

    const lines = stdout.split('\n');
    for (const line of lines) {
      // "Image Name","PID","Session Name","Session#","Mem Usage"
      const match = line.match(/^"([^"]+)","(\d+)"/);
      if (match) {
        const name = match[1];
        const parsedPid = parseInt(match[2], 10);
        if (pids.includes(parsedPid)) {
          map.set(parsedPid, name);
        }
      }
    }

    return map;
  }

  /**
   * Inspects detailed process metadata using PowerShell Get-CimInstance.
   * @param {number} pid
   */
  async inspectProcess(pid) {
    const psScript = `Get-CimInstance Win32_Process -Filter "ProcessId = ${pid}" | Select-Object ProcessId,ParentProcessId,Name,ExecutablePath,CommandLine | ConvertTo-Json -Compress`;
    const { stdout, exitCode } = await this.exec('powershell.exe', [
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      psScript
    ]);

    if (exitCode !== 0 || !stdout.trim()) {
      return {
        pid,
        ppid: null,
        user: null,
        commandLine: '',
        executable: ''
      };
    }

    try {
      const data = JSON.parse(stdout.trim());
      return {
        pid: data.ProcessId || pid,
        ppid: data.ParentProcessId || null,
        user: null,
        commandLine: data.CommandLine || '',
        executable: data.ExecutablePath || data.Name || ''
      };
    } catch {
      return {
        pid,
        ppid: null,
        user: null,
        commandLine: '',
        executable: ''
      };
    }
  }

  /**
   * Terminates a process using taskkill.
   * @param {number} pid
   * @param {string} signal - 'SIGTERM' (graceful) or 'SIGKILL' (force)
   */
  async terminate(pid, signal = 'SIGTERM') {
    const isForce = signal === 'SIGKILL';
    const args = isForce ? ['/F', '/PID', String(pid)] : ['/PID', String(pid)];

    const { exitCode, stderr } = await this.exec('taskkill', args);

    if (exitCode === 0) {
      return { success: true };
    }

    if (stderr.toLowerCase().includes('not found') || stderr.toLowerCase().includes('no running instance')) {
      return { success: true, alreadyExited: true };
    }

    return {
      success: false,
      error: stderr.trim() || `Failed to terminate PID ${pid}.`
    };
  }

  /**
   * Checks whether a process is alive.
   * @param {number} pid
   */
  isAlive(pid) {
    try {
      process.kill(pid, 0);
      return true;
    } catch (err) {
      return err.code === 'EPERM';
    }
  }
}
