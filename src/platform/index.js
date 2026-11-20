import { MacOSAdapter } from './macos.js';
import { LinuxAdapter } from './linux.js';
import { WindowsAdapter } from './windows.js';

let customAdapter = null;

/**
 * Returns the platform adapter for the current or specified OS.
 * @param {string} [platform=process.platform]
 * @returns {MacOSAdapter|LinuxAdapter|WindowsAdapter}
 */
export function getPlatformAdapter(platform = process.platform) {
  if (customAdapter) {
    return customAdapter;
  }

  switch (platform) {
    case 'darwin':
      return new MacOSAdapter();
    case 'linux':
      return new LinuxAdapter();
    case 'win32':
      return new WindowsAdapter();
    default:
      // Fallback to Linux adapter for POSIX-like systems (FreeBSD, OpenBSD, SunOS, etc.)
      return new LinuxAdapter();
  }
}

/**
 * Sets a custom adapter (useful for mocking during testing).
 * @param {object|null} adapter
 */
export function setPlatformAdapter(adapter) {
  customAdapter = adapter;
}
