import { safeExec } from '../utils/exec.js';

/**
 * Linux platform adapter.
 * Uses `ss -tlpn` as primary discovery, with `lsof` fallback.
 */
export class LinuxAdapter {
  constructor(execFn = safeExec) {
    this.exec = execFn;
  }

  /**
   * Scans for TCP listening ports.
   * @param {number} [portFilter]
   */
  async scan(portFilter) {
    // Attempt ss first
    const ssResult = await this.exec('ss', ['-tlpn', '-H']);
    if (ssResult.exitCode === 0 && ssResult.stdout) {
      return this.parseSsOutput(ssResult.stdout, portFilter);
    }

    // Fallback to lsof
    const lsofArgs = ['-iTCP', '-sTCP:LISTEN', '-n', '-P', '-F', 'pcufn'];
    if (portFilter) {
      lsofArgs[0] = `-iTCP:${portFilter}`;
    }
    const lsofResult = await this.exec('lsof', lsofArgs);
    if (lsofResult.stdout) {
      return this.parseLsofFieldOutput(lsofResult.stdout, portFilter);
    }

    return [];
  }

  /**
   * Parses output from `ss -tlpn -H`.
   * Columns: State Recv-Q Send-Q Local Address:Port Peer Address:Port Process
   * Example:
   * LISTEN 0 511 127.0.0.1:3000 0.0.0.0:* users:(("node",pid=18452,fd=23))
   * LISTEN 0 128 *:80 *:* users:(("nginx",pid=1020,fd=6),("nginx",pid=1021,fd=6))
   */
  parseSsOutput(text, portFilter) {
    const records = [];
    const lines = text.split('\n');

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      const parts = line.split(/\s+/);
      if (parts.length < 4) continue;

      const state = parts[0];
      if (state !== 'LISTEN') continue;

      const localAddr = parts[3]; // e.g. 127.0.0.1:3000 or *:80 or [::]:8080
      const lastColon = localAddr.lastIndexOf(':');
      if (lastColon === -1) continue;

      const portStr = localAddr.slice(lastColon + 1);
      const port = parseInt(portStr, 10);
      if (isNaN(port)) continue;

      if (portFilter && port !== portFilter) continue;

      let address = localAddr.slice(0, lastColon);
      if (address.startsWith('[') && address.endsWith(']')) {
        address = address.slice(1, -1);
      }

      // Parse process info from users:(("...",pid=...,fd=...))
      const userPart = parts.slice(5).join(' ');
      const userMatches = [...userPart.matchAll(/\("([^"]+)",pid=(\d+)/g)];

      if (userMatches.length > 0) {
        for (const match of userMatches) {
          records.push({
            port,
            protocol: 'TCP',
            pid: parseInt(match[2], 10) || null,
            processName: match[1],
            address: address || '*',
            user: null,
            status: 'LISTENING'
          });
        }
      } else {
        // Inaccessible PID (due to non-root privileges)
        records.push({
          port,
          protocol: 'TCP',
          pid: null,
          processName: 'unknown',
          address: address || '*',
          user: null,
          status: 'LISTENING'
        });
      }
    }

    return records;
  }

  /**
   * Fallback parser for lsof field output.
   */
  parseLsofFieldOutput(text, portFilter) {
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
        const lastColon = val.lastIndexOf(':');
        if (lastColon === -1) continue;

        const port = parseInt(val.slice(lastColon + 1), 10);
        if (isNaN(port)) continue;
        if (portFilter && port !== portFilter) continue;

        let address = val.slice(0, lastColon);
        if (address.startsWith('[') && address.endsWith(']')) {
          address = address.slice(1, -1);
        }

        records.push({
          port,
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
   * Sends termination signal.
   */
  async terminate(pid, signal = 'SIGTERM') {
    try {
      process.kill(pid, signal);
      return { success: true };
    } catch (err) {
      if (err.code === 'ESRCH') {
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
