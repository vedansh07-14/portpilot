import chalk from 'chalk';

export const logger = {
  info(msg) {
    console.log(chalk.blue('ℹ') + ' ' + msg);
  },
  success(msg) {
    console.log(chalk.green('✔') + ' ' + msg);
  },
  warn(msg) {
    console.warn(chalk.yellow('⚠') + ' ' + chalk.yellow(msg));
  },
  error(msg) {
    console.error(chalk.red('✖') + ' ' + chalk.red(msg));
  },
  dim(msg) {
    console.log(chalk.dim(msg));
  },
  bold(msg) {
    console.log(chalk.bold(msg));
  },
  raw(msg) {
    console.log(msg);
  }
};
