import chalk from 'chalk';
import { scanPorts } from '../../core/scanner.js';
import { handleError } from '../../reporters/errors.js';

export async function watchCommand(options = {}) {
  const intervalMs = Math.max(500, parseInt(options.interval, 10) || 1500);

  console.log(chalk.bold.magenta('\nPORTPILOT WATCH') + chalk.dim(` - Monitoring ports every ${intervalMs}ms`));
  console.log(chalk.dim('Press Ctrl+C to stop watching.\n'));

  let previousSnapshot = new Map();
  let isFirstRun = true;
  let isRunning = true;
  let timer = null;

  const cleanup = () => {
    if (!isRunning) return;
    isRunning = false;
    if (timer) clearTimeout(timer);
    console.log(chalk.dim('\nWatcher stopped. Goodbye!'));
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  async function check() {
    if (!isRunning) return;

    try {
      const records = await scanPorts();
      const currentSnapshot = new Map();

      for (const rec of records) {
        currentSnapshot.set(rec.port, rec);
      }

      const timestamp = new Date().toLocaleTimeString();

      if (isFirstRun) {
        console.log(
          chalk.cyan(`[${timestamp}] `) +
          chalk.white(`Initial scan complete: ${currentSnapshot.size} active listening ports.`)
        );
        isFirstRun = false;
      } else {
        // Detect newly occupied ports
        for (const [port, rec] of currentSnapshot.entries()) {
          if (!previousSnapshot.has(port)) {
            console.log(
              chalk.green(`[${timestamp}] + OCCUPIED `) +
              chalk.bold(`Port ${port}`) +
              chalk.dim(` by ${rec.processName} (PID: ${rec.pid || 'unknown'})`)
            );
          }
        }

        // Detect released ports
        for (const [port, rec] of previousSnapshot.entries()) {
          if (!currentSnapshot.has(port)) {
            console.log(
              chalk.red(`[${timestamp}] - RELEASED `) +
              chalk.bold(`Port ${port}`) +
              chalk.dim(` (was ${rec.processName}, PID: ${rec.pid || 'unknown'})`)
            );
          }
        }
      }

      previousSnapshot = currentSnapshot;
    } catch (err) {
      console.error(chalk.yellow(`Warning: Scan poll error: ${err.message}`));
    }

    if (isRunning) {
      timer = setTimeout(check, intervalMs);
    }
  }

  try {
    await check();
  } catch (err) {
    handleError(err);
  }
}
