import chalk from 'chalk';

/**
 * Formats and prints an aligned terminal table of ports and processes.
 * @param {Array<object>} items - List of normalized port records
 */
export function printPortTable(items) {
  if (!items || items.length === 0) {
    console.log(chalk.yellow('\nNo active listening ports found.'));
    return;
  }

  const headers = ['PORT', 'PID', 'PROCESS', 'STATUS'];

  const rows = items.map(item => [
    String(item.port ?? '-'),
    String(item.pid ?? '-'),
    String(item.processName || item.command || 'unknown'),
    String(item.status || 'LISTENING')
  ]);

  // Calculate maximum column widths
  const colWidths = headers.map((header, colIndex) => {
    const maxValWidth = rows.reduce(
      (max, row) => Math.max(max, (row[colIndex] || '').length),
      0
    );
    return Math.max(header.length, maxValWidth) + 4;
  });

  // Print header
  const headerStr = headers
    .map((header, i) => chalk.bold.cyan(header.padEnd(colWidths[i])))
    .join('');
  console.log('\n' + headerStr);

  // Print rows
  for (const row of rows) {
    const formattedRow = row.map((cell, i) => {
      const padded = cell.padEnd(colWidths[i]);
      if (i === 0) return chalk.greenBright(padded); // PORT
      if (i === 1) return chalk.dim(padded);         // PID
      if (i === 2) return chalk.whiteBright(padded); // PROCESS
      if (i === 3) return chalk.yellow(padded);      // STATUS
      return padded;
    }).join('');
    console.log(formattedRow);
  }

  const count = items.length;
  console.log(
    chalk.dim('\n' + count + ' active ' + (count === 1 ? 'port' : 'ports') + ' detected.\n')
  );
}

/**
 * Formats detailed process metadata for inspect/free/kill commands.
 * @param {object} info - Process inspection details
 */
export function printProcessDetails(info) {
  console.log(chalk.bold.cyan('\nProcess Details:'));
  console.log(chalk.dim('─'.repeat(45)));
  console.log(`${chalk.bold('Port:')}        ${chalk.green(info.port)} (${info.protocol || 'TCP'})`);
  console.log(`${chalk.bold('Status:')}      ${chalk.yellow(info.status || 'LISTENING')}`);
  console.log(`${chalk.bold('PID:')}         ${chalk.white(info.pid || 'Unknown')}`);
  console.log(`${chalk.bold('Process:')}     ${chalk.magenta(info.processName || 'Unknown')}`);
  if (info.user) {
    console.log(`${chalk.bold('User:')}        ${info.user}`);
  }
  if (info.executable) {
    console.log(`${chalk.bold('Executable:')}  ${info.executable}`);
  }
  if (info.commandLine) {
    console.log(`${chalk.bold('Command:')}     ${chalk.dim(info.commandLine)}`);
  }
  if (info.ppid) {
    console.log(`${chalk.bold('Parent PID:')}  ${info.ppid}`);
  }
  if (info.addresses && info.addresses.length > 0) {
    console.log(`${chalk.bold('Bound to:')}    ${info.addresses.join(', ')}`);
  }
  console.log(chalk.dim('─'.repeat(45)) + '\n');
}
