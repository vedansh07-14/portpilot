import { describe, it, expect } from 'vitest';
import { getPlatformAdapter, setPlatformAdapter } from '../src/platform/index.js';
import { MacOSAdapter } from '../src/platform/macos.js';
import { LinuxAdapter } from '../src/platform/linux.js';
import { WindowsAdapter } from '../src/platform/windows.js';

describe('Platform Adapter Factory', () => {
  it('returns MacOSAdapter for darwin', () => {
    const adapter = getPlatformAdapter('darwin');
    expect(adapter).toBeInstanceOf(MacOSAdapter);
  });

  it('returns LinuxAdapter for linux', () => {
    const adapter = getPlatformAdapter('linux');
    expect(adapter).toBeInstanceOf(LinuxAdapter);
  });

  it('returns WindowsAdapter for win32', () => {
    const adapter = getPlatformAdapter('win32');
    expect(adapter).toBeInstanceOf(WindowsAdapter);
  });

  it('falls back to LinuxAdapter for other unix-like OS', () => {
    const adapter = getPlatformAdapter('freebsd');
    expect(adapter).toBeInstanceOf(LinuxAdapter);
  });

  it('allows overriding adapter with custom implementation', () => {
    const mock = { scan: () => [] };
    setPlatformAdapter(mock);
    expect(getPlatformAdapter()).toBe(mock);
    setPlatformAdapter(null); // Reset
  });
});
