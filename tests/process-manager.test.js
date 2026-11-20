import { describe, it, expect, vi } from 'vitest';
import { inspectPort, terminateProcess } from '../src/core/process-manager.js';

describe('Process Manager Core', () => {
  it('returns null if port is not occupied', async () => {
    const mockAdapter = {
      scan: vi.fn().mockResolvedValue([])
    };

    const result = await inspectPort(3000, { adapter: mockAdapter });
    expect(result).toBeNull();
  });

  it('inspects process and returns merged details', async () => {
    const mockAdapter = {
      scan: vi.fn().mockResolvedValue([
        {
          port: 3000,
          protocol: 'TCP',
          pid: 18452,
          processName: 'node',
          address: '127.0.0.1',
          user: 'vedansh',
          status: 'LISTENING'
        }
      ]),
      inspectProcess: vi.fn().mockResolvedValue({
        pid: 18452,
        ppid: 1040,
        user: 'vedansh',
        commandLine: 'node server.js',
        executable: '/usr/local/bin/node'
      })
    };

    const details = await inspectPort(3000, { adapter: mockAdapter });
    expect(details).not.toBeNull();
    expect(details.port).toBe(3000);
    expect(details.pid).toBe(18452);
    expect(details.executable).toBe('/usr/local/bin/node');
    expect(details.commandLine).toBe('node server.js');
    expect(details.ppid).toBe(1040);
  });

  it('handles restricted process inspection gracefully when PID is missing', async () => {
    const mockAdapter = {
      scan: vi.fn().mockResolvedValue([
        {
          port: 80,
          protocol: 'TCP',
          pid: null,
          processName: 'unknown',
          address: '0.0.0.0',
          status: 'LISTENING'
        }
      ]),
      inspectProcess: vi.fn()
    };

    const details = await inspectPort(80, { adapter: mockAdapter });
    expect(details.port).toBe(80);
    expect(details.pid).toBeNull();
    expect(details.permissionRestricted).toBe(true);
    expect(mockAdapter.inspectProcess).not.toHaveBeenCalled();
  });

  it('refuses to terminate protected system processes', async () => {
    const mockAdapter = {
      isAlive: vi.fn().mockReturnValue(true),
      terminate: vi.fn()
    };

    await expect(
      terminateProcess(1, { processName: 'launchd', adapter: mockAdapter })
    ).rejects.toThrow(/critical system process/);

    expect(mockAdapter.terminate).not.toHaveBeenCalled();
  });

  it('safely terminates user process and verifies exit', async () => {
    let alive = true;
    const mockAdapter = {
      isAlive: vi.fn().mockImplementation(() => alive),
      terminate: vi.fn().mockImplementation(() => {
        alive = false;
        return Promise.resolve({ success: true });
      })
    };

    const res = await terminateProcess(18452, {
      processName: 'node',
      adapter: mockAdapter,
      timeout: 500
    });

    expect(res.success).toBe(true);
    expect(res.exited).toBe(true);
    expect(mockAdapter.terminate).toHaveBeenCalledWith(18452, 'SIGTERM');
  });

  it('handles permission denied error during termination', async () => {
    const mockAdapter = {
      isAlive: vi.fn().mockReturnValue(true),
      terminate: vi.fn().mockResolvedValue({
        success: false,
        error: 'Permission denied when sending SIGTERM to PID 999. Try running with sudo.'
      })
    };

    const res = await terminateProcess(999, {
      processName: 'node',
      adapter: mockAdapter
    });

    expect(res.success).toBe(false);
    expect(res.exited).toBe(false);
    expect(res.error).toMatch(/Permission denied/);
  });
});
