import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { scanCommand } from './commands/scan.js';
import { inspectCommand } from './commands/inspect.js';
import { freeCommand } from './commands/free.js';
import { killCommand } from './commands/kill.js';
import { watchCommand } from './commands/watch.js';
import { searchCommand } from './commands/search.js';
import { doctorCommand } from './commands/doctor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkg = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf8'));

export function createProgram() {
  const program = new Command();

  program
    .name('portpilot')
    .description('Intelligent CLI-based port and process manager for developers')
    .version(`v${pkg.version}`, '-v, --version', 'Output the current version of PortPilot');

  // Command: scan
  program
    .command('scan')
    .description('Discover occupied listening TCP ports')
    .option('-p, --port <number>', 'Filter by a specific port number')
    .option('--json', 'Output results in JSON format')
    .action(scanCommand);

  // Command: inspect
  program
    .command('inspect <port>')
    .description('Identify and inspect the process occupying a specified port')
    .option('--json', 'Output results in JSON format')
    .action(inspectCommand);

  // Command: free
  program
    .command('free <port>')
    .description('Gracefully terminate the process occupying a specified port')
    .option('-y, --yes', 'Skip confirmation prompt')
    .action(freeCommand);

  // Command: kill
  program
    .command('kill <port>')
    .description('Terminate the process occupying a specified port with explicit confirmation')
    .option('-f, --force', 'Force termination (SIGKILL / taskkill /F)')
    .option('-y, --yes', 'Skip confirmation prompts')
    .action(killCommand);

  // Command: watch
  program
    .command('watch')
    .description('Monitor listening ports and detect newly occupied or released ports in real-time')
    .option('-i, --interval <ms>', 'Polling interval in milliseconds (default: 1500)', '1500')
    .action(watchCommand);

  // Command: search
  program
    .command('search <process-name>')
    .description('Search active listening ports by process name')
    .option('--json', 'Output results in JSON format')
    .action(searchCommand);

  // Command: doctor
  program
    .command('doctor')
    .description('Diagnose common port conflicts and provide troubleshooting advice')
    .action(doctorCommand);

  return program;
}

export function runCLI(argv = process.argv) {
  const program = createProgram();
  program.parse(argv);
}
