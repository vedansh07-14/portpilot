import { describe, it, expect } from 'vitest';
import { safeExec } from '../src/utils/exec.js';

describe('Safe Subprocess Execution', () => {
  it('executes a binary and returns stdout and exitCode 0', async () => {
    const res = await safeExec('node', ['-e', 'console.log("hello safe exec")']);
    expect(res.exitCode).toBe(0);
    expect(res.stdout.trim()).toBe('hello safe exec');
  });

  it('captures exitCode and stderr on command failure without throwing uncaught exceptions', async () => {
    const res = await safeExec('node', ['-e', 'process.stderr.write("failure"); process.exit(42)']);
    expect(res.exitCode).toBe(42);
    expect(res.stderr).toContain('failure');
  });

  it('handles non-existent binary safely', async () => {
    const res = await safeExec('non_existent_binary_xyz_123');
    expect(res.exitCode).not.toBe(0);
    expect(res.error).toBeDefined();
  });
});
