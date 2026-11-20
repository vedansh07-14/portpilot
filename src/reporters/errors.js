import chalk from 'chalk';

/**
 * Formats and prints an error message gracefully.
 * @param {Error|string} err
 * @param {object} [options]
 * @param {boolean} [options.json]
 */
export function handleError(err, options = {}) {
  const message = typeof err === 'string' ? err : err.message || 'An unexpected error occurred.';

  if (options.json) {
    console.error(JSON.stringify({ error: message }, null, 2));
    process.exit(1);
  }

  console.error('\n' + chalk.bgRed.black(' ERROR ') + ' ' + chalk.red(message));

  if (err?.code === 'EACCES' || err?.code === 'EPERM' || message.toLowerCase().includes('permission')) {
    console.error(
      chalk.yellow('\nTip: This operation may require elevated privileges. Try running with sudo or as administrator.')
    );
  }

  process.exit(1);
}
