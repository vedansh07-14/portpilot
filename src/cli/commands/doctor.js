import chalk from 'chalk';
import ora from 'ora';
import { scanPorts } from '../../core/scanner.js';
import { handleError } from '../../reporters/errors.js';

const KNOWN_DEV_PORTS = {
  3000: 'React / Next.js / Express default port',
  5000: 'macOS AirPlay Receiver / Flask default port',
  5173: 'Vite default development server',
  7000: 'macOS AirPlay Receiver / custom microservice',
  8000: 'Django / FastAPI / Python HTTP server',
  8080: 'Webpack / Vue / Spring Boot / Tomcat server',
  5432: 'PostgreSQL database service',
  6379: 'Redis in-memory store',
  27017: 'MongoDB database service'
};

export async function doctorCommand(_options = {}) {
  console.log(chalk.bold.magenta('\nPORTPILOT DOCTOR') + chalk.dim(' - Port Conflict & Environment Diagnostics\n'));

  const spinner = ora({
    text: 'Analyzing listening ports and system environment...',
    color: 'cyan'
  }).start();

  try {
    const ports = await scanPorts();
    spinner.stop();

    const issues = [];
    const recommendations = [];

    // 1. Check macOS AirPlay Receiver port conflict
    if (process.platform === 'darwin') {
      const airplay5000 = ports.find(p => p.port === 5000 && p.processName.toLowerCase().includes('controlce'));
      const airplay7000 = ports.find(p => p.port === 7000 && p.processName.toLowerCase().includes('controlce'));

      if (airplay5000 || airplay7000) {
        issues.push({
          severity: 'warn',
          title: 'macOS AirPlay Receiver occupies standard development ports (5000 or 7000)',
          detail: 'macOS ControlCenter binds port 5000 and 7000 by default for AirPlay Receiver, causing EADDRINUSE for Flask/Docker/Node apps.',
          resolution: 'Go to System Settings > General > AirDrop & AirPlay > Toggle off "AirPlay Receiver", or configure your dev server to use another port.'
        });
      }
    }

    // 2. Check for active common web dev ports
    const activeDevPorts = ports.filter(p => [3000, 5173, 8080].includes(p.port));
    if (activeDevPorts.length > 0) {
      for (const item of activeDevPorts) {
        issues.push({
          severity: 'info',
          title: `Port ${item.port} is occupied by "${item.processName}" (PID: ${item.pid || 'unknown'})`,
          detail: KNOWN_DEV_PORTS[item.port] || 'Standard development port',
          resolution: `If your new dev server fails with EADDRINUSE on port ${item.port}, free it with: portpilot free ${item.port}`
        });
      }
    }

    // 3. Check for restricted / root-owned processes
    const restrictedPorts = ports.filter(p => !p.pid);
    if (restrictedPorts.length > 0) {
      issues.push({
        severity: 'warn',
        title: `${restrictedPorts.length} port(s) have restricted process IDs`,
        detail: `Ports: ${restrictedPorts.map(p => p.port).join(', ')}. These sockets are owned by another user or system daemon.`,
        resolution: 'Run `sudo portpilot scan` to discover full process ownership for system-bound ports.'
      });
    }

    // 4. Check for orphan/zombie node processes
    const nodeProcesses = ports.filter(p => p.processName.toLowerCase() === 'node');
    if (nodeProcesses.length > 3) {
      recommendations.push({
        title: `Multiple Node.js processes detected (${nodeProcesses.length} active ports)`,
        detail: 'Old development servers or worker threads may have been left running in the background.',
        resolution: 'Run `portpilot search node` to review all running Node listeners and free unused ones.'
      });
    }

    // Print Diagnostics Report
    console.log(chalk.bold.underline('DIAGNOSTIC FINDINGS:'));

    if (issues.length === 0 && recommendations.length === 0) {
      console.log(chalk.green('\n✔ No port conflicts or anomalous listeners detected.'));
      console.log(chalk.dim(`  Total listening ports checked: ${ports.length}`));
      return;
    }

    for (const issue of issues) {
      const badge = issue.severity === 'warn'
        ? chalk.bgYellow.black(' WARNING ')
        : chalk.bgBlue.black(' INFO ');
      console.log(`\n${badge} ${chalk.bold(issue.title)}`);
      console.log(`  ${chalk.dim('Cause:')}       ${issue.detail}`);
      console.log(`  ${chalk.cyan('Resolution:')}  ${issue.resolution}`);
    }

    for (const rec of recommendations) {
      console.log(`\n${chalk.bgCyan.black(' ADVICE ')} ${chalk.bold(rec.title)}`);
      console.log(`  ${chalk.dim('Detail:')}      ${rec.detail}`);
      console.log(`  ${chalk.cyan('Action:')}      ${rec.resolution}`);
    }

    console.log(chalk.dim('\n' + '─'.repeat(55)));
    console.log(chalk.dim(`Summary: ${issues.length} potential conflict(s) reviewed across ${ports.length} ports.\n`));
  } catch (err) {
    if (spinner) spinner.stop();
    handleError(err);
  }
}
