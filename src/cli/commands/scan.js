import ora from 'ora';
import chalk from 'chalk';
import { scanPorts } from '../../core/scanner.js';
import { printPortTable } from '../../reporters/table.js';
import { outputJson } from '../../reporters/json.js';
import { handleError } from '../../reporters/errors.js';

export async function scanCommand(options) {
  const isJson = Boolean(options.json);
  let spinner = null;

  if (!isJson) {
    console.log(chalk.bold.magenta('\nPORTPILOT') + chalk.dim(' - Port Scanner'));
    spinner = ora({
      text: options.port ? `Scanning port ${options.port}...` : 'Scanning occupied ports...',
      color: 'cyan'
    }).start();
  }

  try {
    const results = await scanPorts({ port: options.port });

    if (spinner) {
      spinner.stop();
    }

    if (isJson) {
      outputJson(results);
      return;
    }

    printPortTable(results);
  } catch (err) {
    if (spinner) spinner.stop();
    handleError(err, { json: isJson });
  }
}
