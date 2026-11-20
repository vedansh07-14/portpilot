import { describe, it, expect } from 'vitest';
import {
  isCriticalPid,
  isProtectedProcess,
  assertSafeToTerminate
} from '../src/core/safety.js';

describe('Safety Guardrails', () => {
  it('flags PID 0 and 1 as critical system processes', () => {
    expect(isCriticalPid(0)).toBe(true);
    expect(isCriticalPid(1)).toBe(true);
    expect(isCriticalPid(18452)).toBe(false);
  });

  it('identifies protected system services across platforms', () => {
    expect(isProtectedProcess('launchd')).toBe(true);
    expect(isProtectedProcess('/sbin/launchd')).toBe(true);
    expect(isProtectedProcess('systemd')).toBe(true);
    expect(isProtectedProcess('/usr/lib/systemd/systemd')).toBe(true);
    expect(isProtectedProcess('svchost.exe')).toBe(true);
    expect(isProtectedProcess('C:\\Windows\\System32\\svchost.exe')).toBe(true);

    expect(isProtectedProcess('node')).toBe(false);
    expect(isProtectedProcess('vite')).toBe(false);
    expect(isProtectedProcess('python')).toBe(false);
  });

  it('throws an error when trying to terminate PID 0 or 1', () => {
    expect(() => assertSafeToTerminate({ pid: 1, processName: 'launchd' })).toThrow(
      /critical system process/
    );
    expect(() => assertSafeToTerminate({ pid: 0, processName: 'kernel_task' })).toThrow(
      /critical system process/
    );
  });

  it('throws an error when trying to terminate protected processes', () => {
    expect(() => assertSafeToTerminate({ pid: 400, processName: 'systemd-journald' })).toThrow(
      /protected system service/
    );
    expect(() => assertSafeToTerminate({ pid: 888, processName: 'services.exe' })).toThrow(
      /protected system service/
    );
  });

  it('allows standard user development processes', () => {
    expect(() => assertSafeToTerminate({ pid: 18452, processName: 'node' })).not.toThrow();
    expect(() => assertSafeToTerminate({ pid: 19021, processName: 'vite' })).not.toThrow();
  });
});
