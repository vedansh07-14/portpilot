import chalk from 'chalk';
import ora from 'ora';
import { confirm } from '@inquirer/prompts';
import { inspectPort, terminateProcess } from '../../core/process-manager.js';
import { printProcessDetails } from '../../reporters/table.js';
import { handleError } from '../../reporters/errors.js';

export async function killCommand(port, options = {}) {
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

    // Display process details
    printProcessDetails(details);

    // Confirmation 1: Explicit confirmation
    const confirmKill = options.yes || await confirm({
      message: `Are you sure you want to terminate "${details.processName}" (PID: ${details.pid}) on port ${port}?`,
      default: false
    });

    if (!confirmKill) {
      console.log(chalk.dim('\nOperation cancelled.'));
      return;
    }

    let signal = 'SIGTERM';

    if (options.force) {
      // Confirmation 2: Additional confirmation for force termination
      const confirmForce = options.yes || await confirm({
        message: chalk.red.bold('FORCE KILL WARNING: ') +
          'Force termination terminates the process immediately without running cleanup handlers. Confirm force kill (SIGKILL)?',
        default: false
      });

      if (!confirmForce) {
        console.log(chalk.dim('\nForce kill cancelled.'));
        return;
      }
      signal = 'SIGKILL';
    }

    const spinner = ora({
      text: `Terminating PID ${details.pid} with ${signal}...`,
      color: 'red'
    }).start();

    const result = await terminateProcess(details.pid, {
      signal,
      processName: details.processName,
      timeout: 3000
    });

    spinner.stop();

    if (result.success && result.exited) {
      console.log(chalk.green(`\n✔ Process ${details.pid} terminated. Port ${port} is now free.`));
    } else {
      if (result.error) {
        console.error(chalk.red(`\n✖ Termination failed: ${result.error}`));
      } else {
        console.log(chalk.yellow(`\n⚠ Process ${details.pid} did not exit after ${signal}.`));
        if (signal !== 'SIGKILL') {
          console.log(chalk.cyan(`Try force killing with: portpilot kill ${port} --force`));
        }
      }
    }
  } catch (err) {
    handleError(err);
  }
}
