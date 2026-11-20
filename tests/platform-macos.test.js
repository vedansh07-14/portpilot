import { describe, it, expect, vi } from 'vitest';
import { MacOSAdapter } from '../src/platform/macos.js';

describe('macOS Adapter', () => {
  it('parses lsof -F output correctly', async () => {
    const sampleOutput = [
      'p18452',
      'cnode',
      'u501',
      'f23',
      'n127.0.0.1:3000',
      'f24',
      'n[::1]:3000',
      'p1585',
      'cpostgres',
      'u501',
      'f7',
      'n*:5432'
    ].join('\n');

    const mockExec = vi.fn().mockResolvedValue({
      stdout: sampleOutput,
      stderr: '',
      exitCode: 0
    });

    const adapter = new MacOSAdapter(mockExec);
    const results = await adapter.scan();

    expect(results).toHaveLength(3);
    expect(results[0]).toEqual({
      port: 3000,
      protocol: 'TCP',
      pid: 18452,
      processName: 'node',
      address: '127.0.0.1',
      user: '501',
      status: 'LISTENING'
    });
    expect(results[1].address).toBe('::1');
    expect(results[2].port).toBe(5432);
    expect(results[2].address).toBe('*');
  });

  it('handles empty scan output when no ports are listening', async () => {
    const mockExec = vi.fn().mockResolvedValue({
      stdout: '',
      stderr: '',
      exitCode: 1
    });

    const adapter = new MacOSAdapter(mockExec);
    const results = await adapter.scan(49151);
    expect(results).toEqual([]);
  });

  it('throws an error if lsof binary is not found on the system', async () => {
    const error = new Error('spawn lsof ENOENT');
    error.code = 'ENOENT';

    const mockExec = vi.fn().mockResolvedValue({
      stdout: '',
      stderr: 'lsof: command not found',
      exitCode: 127,
      error
    });

    const adapter = new MacOSAdapter(mockExec);
    await expect(adapter.scan()).rejects.toThrow(/System utility "lsof" was not found/);
  });

  it('inspects process details using ps -ww', async () => {
    const psOutput = '18452 1024 vedansh /usr/local/bin/node /app/server.js --port 3000';
    const mockExec = vi.fn().mockResolvedValue({
      stdout: psOutput,
      stderr: '',
      exitCode: 0
    });

    const adapter = new MacOSAdapter(mockExec);
    const info = await adapter.inspectProcess(18452);

    expect(info.pid).toBe(18452);
    expect(info.ppid).toBe(1024);
    expect(info.user).toBe('vedansh');
    expect(info.executable).toBe('/usr/local/bin/node');
    expect(info.commandLine).toBe('/usr/local/bin/node /app/server.js --port 3000');
  });
});
