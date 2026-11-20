import ora from 'ora';
import chalk from 'chalk';
import { scanPorts } from '../../core/scanner.js';
import { validateSearchQuery } from '../../utils/validation.js';
import { printPortTable } from '../../reporters/table.js';
import { outputJson } from '../../reporters/json.js';
import { handleError } from '../../reporters/errors.js';

export async function searchCommand(query, options = {}) {
  const isJson = Boolean(options.json);
  let spinner = null;

  try {
    const cleanQuery = validateSearchQuery(query).toLowerCase();

    if (!isJson) {
      spinner = ora({
        text: `Searching for processes matching "${cleanQuery}"...`,
        color: 'cyan'
      }).start();
    }

    const allPorts = await scanPorts();

    if (spinner) {
      spinner.stop();
    }

    const matches = allPorts.filter(item => {
      const name = (item.processName || '').toLowerCase();
      const cmd = (item.command || '').toLowerCase();
      return name.includes(cleanQuery) || cmd.includes(cleanQuery);
    });

    if (isJson) {
      outputJson(matches);
      return;
    }

    if (matches.length === 0) {
      console.log(chalk.yellow(`\nNo active ports found for process matching "${query}".`));
      return;
    }

    console.log(chalk.bold.magenta('\nPORTPILOT') + chalk.dim(` - Search results for "${query}":`));
    printPortTable(matches);
  } catch (err) {
    if (spinner) spinner.stop();
    handleError(err, { json: isJson });
  }
}
