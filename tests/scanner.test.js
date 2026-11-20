import { describe, it, expect, vi } from 'vitest';
import { scanPorts } from '../src/core/scanner.js';

describe('Scanner Core', () => {
  it('delegates to adapter and normalizes records', async () => {
    const mockAdapter = {
      scan: vi.fn().mockResolvedValue([
        {
          port: 3000,
          protocol: 'TCP',
          pid: 1234,
          processName: 'node',
          address: '127.0.0.1',
          status: 'LISTENING'
        }
      ])
    };

    const results = await scanPorts({ adapter: mockAdapter });
    expect(results).toHaveLength(1);
    expect(results[0].port).toBe(3000);
    expect(results[0].pid).toBe(1234);
    expect(mockAdapter.scan).toHaveBeenCalledWith(null);
  });

  it('passes port filter to adapter after validation', async () => {
    const mockAdapter = {
      scan: vi.fn().mockResolvedValue([
        {
          port: 5173,
          protocol: 'TCP',
          pid: 5678,
          processName: 'vite',
          address: '127.0.0.1',
          status: 'LISTENING'
        }
      ])
    };

    const results = await scanPorts({ port: '5173', adapter: mockAdapter });
    expect(results).toHaveLength(1);
    expect(mockAdapter.scan).toHaveBeenCalledWith(5173);
  });

  it('rejects invalid port filters', async () => {
    const mockAdapter = { scan: vi.fn() };
    await expect(scanPorts({ port: 'invalid', adapter: mockAdapter })).rejects.toThrow(/Invalid port/);
    expect(mockAdapter.scan).not.toHaveBeenCalled();
  });
});
