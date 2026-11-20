import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { scanCommand } from '../src/cli/commands/scan.js';
import { inspectCommand } from '../src/cli/commands/inspect.js';
import { searchCommand } from '../src/cli/commands/search.js';
import { doctorCommand } from '../src/cli/commands/doctor.js';
import { setPlatformAdapter } from '../src/platform/index.js';

describe('CLI Commands Integration', () => {
  const mockAdapter = {
    scan: vi.fn().mockResolvedValue([
      {
        port: 3000,
        protocol: 'TCP',
        pid: 18452,
        processName: 'node',
        address: '127.0.0.1',
        user: 'testuser',
        status: 'LISTENING'
      }
    ]),
    inspectProcess: vi.fn().mockResolvedValue({
      pid: 18452,
      ppid: 1,
      user: 'testuser',
      commandLine: 'node server.js',
      executable: '/usr/local/bin/node'
    })
  };

  beforeEach(() => {
    setPlatformAdapter(mockAdapter);
  });

  afterEach(() => {
    setPlatformAdapter(null);
    vi.restoreAllMocks();
  });

  it('scanCommand executes and logs JSON when requested', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await scanCommand({ json: true });

    expect(logSpy).toHaveBeenCalled();
    const parsed = JSON.parse(logSpy.mock.calls[0][0]);
    expect(parsed[0].port).toBe(3000);
    expect(parsed[0].processName).toBe('node');
  });

  it('inspectCommand executes and logs JSON details', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await inspectCommand(3000, { json: true });

    expect(logSpy).toHaveBeenCalled();
    const parsed = JSON.parse(logSpy.mock.calls[0][0]);
    expect(parsed.port).toBe(3000);
    expect(parsed.pid).toBe(18452);
    expect(parsed.executable).toBe('/usr/local/bin/node');
  });

  it('searchCommand finds matching processes', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await searchCommand('node', { json: true });

    expect(logSpy).toHaveBeenCalled();
    const parsed = JSON.parse(logSpy.mock.calls[0][0]);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].processName).toBe('node');
  });

  it('doctorCommand analyzes ports and logs report', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await doctorCommand();

    expect(logSpy).toHaveBeenCalled();
  });
});
