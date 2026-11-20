import chalk from 'chalk';
import ora from 'ora';
import { confirm } from '@inquirer/prompts';
import { inspectPort, terminateProcess } from '../../core/process-manager.js';
import { printProcessDetails } from '../../reporters/table.js';
import { handleError } from '../../reporters/errors.js';

export async function freeCommand(port, options = {}) {
  try {
    const details = await inspectPort(port);

    if (!details) {
      console.log(chalk.green(`\nPort ${port} is already free.`));
      return;
    }

    if (!details.pid) {
      console.log(chalk.yellow(`\nPort ${port} is occupied, but the process ID is not accessible.`));
      console.log(chalk.dim('Run with sudo / Administrator privileges to manage this process.'));
      return;
    }

    // Display process details first
    printProcessDetails(details);

    // Prompt user for confirmation (support --yes / -y for non-interactive scripts)
    const shouldProceed = options.yes || await confirm({
      message: `Do you want to gracefully terminate "${details.processName}" (PID: ${details.pid}) on port ${port}?`,
      default: false
    });

    if (!shouldProceed) {
      console.log(chalk.dim('\nOperation cancelled. No processes were modified.'));
      return;
    }

    const spinner = ora({
      text: `Sending SIGTERM to PID ${details.pid}...`,
      color: 'yellow'
    }).start();

    const result = await terminateProcess(details.pid, {
      signal: 'SIGTERM',
      processName: details.processName,
      timeout: 3000
    });

    spinner.stop();

    if (result.success && result.exited) {
      console.log(chalk.green(`\n✔ Successfully freed port ${port} (PID ${details.pid} has exited).`));
    } else {
      console.log(chalk.yellow(`\n⚠ Process PID ${details.pid} did not exit within timeout.`));
      console.log(chalk.dim('It may be running long-cleanup handlers or ignoring graceful termination.'));
      console.log(chalk.cyan(`To force termination, run: portpilot kill ${port}`));
    }
  } catch (err) {
    handleError(err);
  }
}
