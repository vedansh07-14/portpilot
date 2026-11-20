import { describe, it, expect } from 'vitest';
import { normalizePortRecords } from '../src/core/normalizer.js';

describe('Port Normalizer', () => {
  it('normalizes single port records and capitalizes protocol and status', () => {
    const raw = [
      {
        port: 3000,
        protocol: 'tcp',
        pid: '18452',
        processName: 'node',
        address: '127.0.0.1',
        status: 'listening'
      }
    ];

    const result = normalizePortRecords(raw);
    expect(result).toEqual([
      {
        port: 3000,
        protocol: 'TCP',
        pid: 18452,
        processName: 'node',
        command: 'node',
        status: 'LISTENING',
        addresses: ['127.0.0.1'],
        user: null
      }
    ]);
  });

  it('deduplicates multiple addresses for the same port and PID (IPv4 + IPv6)', () => {
    const raw = [
      {
        port: 5432,
        protocol: 'TCP',
        pid: 1585,
        processName: 'postgres',
        address: '127.0.0.1',
        user: 'postgres'
      },
      {
        port: 5432,
        protocol: 'TCP',
        pid: 1585,
        processName: 'postgres',
        address: '::1',
        user: 'postgres'
      }
    ];

    const result = normalizePortRecords(raw);
    expect(result).toHaveLength(1);
    expect(result[0].port).toBe(5432);
    expect(result[0].addresses).toEqual(['127.0.0.1', '::1']);
    expect(result[0].user).toBe('postgres');
  });

  it('sorts records ascending by port number', () => {
    const raw = [
      { port: 8080, pid: 200, processName: 'java' },
      { port: 3000, pid: 100, processName: 'node' },
      { port: 5173, pid: 150, processName: 'vite' }
    ];

    const result = normalizePortRecords(raw);
    expect(result.map(r => r.port)).toEqual([3000, 5173, 8080]);
  });

  it('extracts base process name from full paths', () => {
    const raw = [
      { port: 3000, pid: 100, processName: '/usr/local/bin/node' },
      { port: 4000, pid: 101, processName: 'C:\\Program Files\\nodejs\\node.exe' }
    ];

    const result = normalizePortRecords(raw);
    expect(result[0].processName).toBe('node');
    expect(result[1].processName).toBe('node.exe');
  });

  it('handles empty input gracefully', () => {
    expect(normalizePortRecords([])).toEqual([]);
    expect(normalizePortRecords(null)).toEqual([]);
    expect(normalizePortRecords(undefined)).toEqual([]);
  });
});
