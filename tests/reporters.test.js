import { describe, it, expect, vi } from 'vitest';
import { printPortTable, printProcessDetails } from '../src/reporters/table.js';
import { outputJson } from '../src/reporters/json.js';
import { handleError } from '../src/reporters/errors.js';

describe('Reporters', () => {
  it('formats and outputs JSON', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    outputJson({ status: 'ok', count: 1 });

    expect(logSpy).toHaveBeenCalled();
    const output = logSpy.mock.calls[0][0];
    expect(JSON.parse(output)).toEqual({ status: 'ok', count: 1 });
    logSpy.mockRestore();
  });

  it('prints empty table message when no ports found', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    printPortTable([]);
    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it('prints aligned table when ports exist', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    printPortTable([
      { port: 3000, pid: 1234, processName: 'node', status: 'LISTENING' }
    ]);
    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it('prints detailed process metadata', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    printProcessDetails({
      port: 3000,
      protocol: 'TCP',
      pid: 1234,
      processName: 'node',
      user: 'dev',
      executable: '/bin/node',
      commandLine: 'node app.js',
      ppid: 100,
      addresses: ['127.0.0.1']
    });
    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it('handles error in JSON mode and exits process', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {});

    handleError(new Error('Test failure'), { json: true });

    expect(errSpy).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(1);

    errSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it('handles permission errors with helpful tip', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {});

    const permErr = new Error('Permission denied');
    permErr.code = 'EPERM';
    handleError(permErr, { json: false });

    expect(errSpy).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(1);

    errSpy.mockRestore();
    exitSpy.mockRestore();
  });
});
