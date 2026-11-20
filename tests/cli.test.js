import { describe, it, expect } from 'vitest';
import { createProgram } from '../src/cli/index.js';

describe('CLI Program Architecture', () => {
  it('registers all required CLI commands', () => {
    const program = createProgram();
    const commandNames = program.commands.map(cmd => cmd.name());

    expect(commandNames).toContain('scan');
    expect(commandNames).toContain('inspect');
    expect(commandNames).toContain('free');
    expect(commandNames).toContain('kill');
    expect(commandNames).toContain('watch');
    expect(commandNames).toContain('search');
    expect(commandNames).toContain('doctor');
  });

  it('configures options correctly for scan', () => {
    const program = createProgram();
    const scanCmd = program.commands.find(c => c.name() === 'scan');
    const optionNames = scanCmd.options.map(opt => opt.long);

    expect(optionNames).toContain('--port');
    expect(optionNames).toContain('--json');
  });

  it('configures options correctly for kill', () => {
    const program = createProgram();
    const killCmd = program.commands.find(c => c.name() === 'kill');
    const optionNames = killCmd.options.map(opt => opt.long);

    expect(optionNames).toContain('--force');
    expect(optionNames).toContain('--yes');
  });
});
