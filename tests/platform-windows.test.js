import { describe, it, expect, vi } from 'vitest';
import { WindowsAdapter } from '../src/platform/windows.js';

describe('Windows Adapter', () => {
  it('parses netstat -ano output for LISTENING sockets', async () => {
    const netstatOutput = [
      'Active Connections',
      '',
      '  Proto  Local Address          Foreign Address        State           PID',
      '  TCP    0.0.0.0:135            0.0.0.0:0              LISTENING       988',
      '  TCP    127.0.0.1:3000         0.0.0.0:0              LISTENING       18452',
      '  TCP    127.0.0.1:3000         127.0.0.1:54321        ESTABLISHED     18452', // Should ignore established
      '  TCP    [::]:8080              [::]:0                 LISTENING       4321'
    ].join('\n');

    const tasklistOutput = [
      '"svchost.exe","988","Services","0","15,200 K"',
      '"node.exe","18452","Console","1","55,400 K"',
      '"java.exe","4321","Console","1","120,400 K"'
    ].join('\n');

    const mockExec = vi.fn().mockImplementation((cmd) => {
      if (cmd === 'netstat') {
        return Promise.resolve({ stdout: netstatOutput, stderr: '', exitCode: 0 });
      }
      if (cmd === 'tasklist') {
        return Promise.resolve({ stdout: tasklistOutput, stderr: '', exitCode: 0 });
      }
      return Promise.resolve({ stdout: '', stderr: '', exitCode: 1 });
    });

    const adapter = new WindowsAdapter(mockExec);
    const results = await adapter.scan();

    expect(results).toHaveLength(3);

    expect(results[0].port).toBe(135);
    expect(results[0].pid).toBe(988);
    expect(results[0].processName).toBe('svchost.exe');

    expect(results[1].port).toBe(3000);
    expect(results[1].pid).toBe(18452);
    expect(results[1].processName).toBe('node.exe');

    expect(results[2].port).toBe(8080);
    expect(results[2].pid).toBe(4321);
    expect(results[2].processName).toBe('java.exe');
  });

  it('inspects process metadata using PowerShell Get-CimInstance', async () => {
    const psJson = JSON.stringify({
      ProcessId: 18452,
      ParentProcessId: 1040,
      Name: 'node.exe',
      ExecutablePath: 'C:\\Program Files\\nodejs\\node.exe',
      CommandLine: '"C:\\Program Files\\nodejs\\node.exe" server.js'
    });

    const mockExec = vi.fn().mockImplementation((cmd) => {
      if (cmd === 'powershell.exe') {
        return Promise.resolve({ stdout: psJson, stderr: '', exitCode: 0 });
      }
      return Promise.resolve({ stdout: '', stderr: '', exitCode: 1 });
    });

    const adapter = new WindowsAdapter(mockExec);
    const info = await adapter.inspectProcess(18452);

    expect(info.pid).toBe(18452);
    expect(info.ppid).toBe(1040);
    expect(info.executable).toBe('C:\\Program Files\\nodejs\\node.exe');
    expect(info.commandLine).toBe('"C:\\Program Files\\nodejs\\node.exe" server.js');
  });

  it('terminates process using taskkill', async () => {
    const mockExec = vi.fn().mockImplementation((cmd, args) => {
      if (cmd === 'taskkill' && args.includes('/PID') && args.includes('18452')) {
        return Promise.resolve({ stdout: 'SUCCESS: Sent termination signal.', stderr: '', exitCode: 0 });
      }
      return Promise.resolve({ stdout: '', stderr: '', exitCode: 1 });
    });

    const adapter = new WindowsAdapter(mockExec);
    const res = await adapter.terminate(18452, 'SIGTERM');
    expect(res.success).toBe(true);
  });
});
