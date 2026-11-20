import ora from 'ora';
import chalk from 'chalk';
import { inspectPort } from '../../core/process-manager.js';
import { printProcessDetails } from '../../reporters/table.js';
import { outputJson } from '../../reporters/json.js';
import { handleError } from '../../reporters/errors.js';

export async function inspectCommand(port, options = {}) {
  const isJson = Boolean(options.json);
  let spinner = null;

  if (!isJson) {
    spinner = ora({
      text: `Inspecting port ${port}...`,
      color: 'cyan'
    }).start();
  }

  try {
    const details = await inspectPort(port);

    if (spinner) {
      spinner.stop();
    }

    if (!details) {
      if (isJson) {
        outputJson({ port: Number(port), occupied: false });
      } else {
        console.log(chalk.green(`\nPort ${port} is currently free (no listening process found).`));
      }
      return;
    }

    if (isJson) {
      outputJson(details);
      return;
    }

    printProcessDetails(details);

    if (details.permissionRestricted) {
      console.log(
        chalk.yellow('Note: Process ID / metadata is restricted. Run with sudo/administrator for complete details.\n')
      );
    }
  } catch (err) {
    if (spinner) spinner.stop();
    handleError(err, { json: isJson });
  }
}
