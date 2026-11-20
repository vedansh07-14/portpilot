import { describe, it, expect, vi } from 'vitest';
import { LinuxAdapter } from '../src/platform/linux.js';

describe('Linux Adapter', () => {
  it('parses ss -tlpn output with listening sockets and users', async () => {
    const ssOutput = [
      'State   Recv-Q  Send-Q   Local Address:Port   Peer Address:Port   Process',
      'LISTEN  0       511          127.0.0.1:3000        0.0.0.0:*       users:(("node",pid=18452,fd=23))',
      'LISTEN  0       128               [::]:8080           [::]:*       users:(("java",pid=2901,fd=4))',
      'LISTEN  0       128            0.0.0.0:22          0.0.0.0:*       ' // Non-root inaccessible PID
    ].join('\n');

    const mockExec = vi.fn().mockImplementation((cmd) => {
      if (cmd === 'ss') {
        return Promise.resolve({ stdout: ssOutput, stderr: '', exitCode: 0 });
      }
      return Promise.resolve({ stdout: '', stderr: '', exitCode: 1 });
    });

    const adapter = new LinuxAdapter(mockExec);
    const results = await adapter.scan();

    expect(results).toHaveLength(3);
    expect(results[0]).toEqual({
      port: 3000,
      protocol: 'TCP',
      pid: 18452,
      processName: 'node',
      address: '127.0.0.1',
      user: null,
      status: 'LISTENING'
    });

    expect(results[1]).toEqual({
      port: 8080,
      protocol: 'TCP',
      pid: 2901,
      processName: 'java',
      address: '::',
      user: null,
      status: 'LISTENING'
    });

    expect(results[2]).toEqual({
      port: 22,
      protocol: 'TCP',
      pid: null,
      processName: 'unknown',
      address: '0.0.0.0',
      user: null,
      status: 'LISTENING'
    });
  });

  it('falls back to lsof when ss fails or is not available', async () => {
    const lsofOutput = [
      'p5173',
      'cvite',
      'u1000',
      'f3',
      'n127.0.0.1:5173'
    ].join('\n');

    const mockExec = vi.fn().mockImplementation((cmd) => {
      if (cmd === 'ss') {
        return Promise.resolve({ stdout: '', stderr: 'ss: command not found', exitCode: 127 });
      }
      if (cmd === 'lsof') {
        return Promise.resolve({ stdout: lsofOutput, stderr: '', exitCode: 0 });
      }
      return Promise.resolve({ stdout: '', stderr: '', exitCode: 1 });
    });

    const adapter = new LinuxAdapter(mockExec);
    const results = await adapter.scan();

    expect(results).toHaveLength(1);
    expect(results[0].port).toBe(5173);
    expect(results[0].processName).toBe('vite');
    expect(results[0].pid).toBe(5173);
  });
});
