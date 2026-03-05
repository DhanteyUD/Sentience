import chalk from 'chalk';

export type LogLevel = 'info' | 'success' | 'warn' | 'error' | 'debug' | 'agent' | 'wallet' | 'tx';

const icons: Record<LogLevel, string> = {
  info:    '●',
  success: '✓',
  warn:    '⚠',
  error:   '✗',
  debug:   '◆',
  agent:   '🤖',
  wallet:  '💳',
  tx:      '⇄',
};

const colors: Record<LogLevel, (s: string) => string> = {
  info:    chalk.cyan,
  success: chalk.green,
  warn:    chalk.yellow,
  error:   chalk.red,
  debug:   chalk.gray,
  agent:   chalk.magenta,
  wallet:  chalk.blue,
  tx:      chalk.white,
};

export const logger = {
  log(level: LogLevel, message: string, data?: any): void {
    const ts = new Date().toISOString().split('T')[1].replace('Z', '');
    const icon = icons[level];
    const colorFn = colors[level];
    const prefix = chalk.gray(`[${ts}]`) + ' ' + colorFn(`${icon} [${level.toUpperCase()}]`);
    console.log(`${prefix} ${message}`);
    if (data !== undefined) {
      console.log(chalk.gray(JSON.stringify(data, null, 2)));
    }
  },
  info:    (msg: string, data?: any) => logger.log('info', msg, data),
  success: (msg: string, data?: any) => logger.log('success', msg, data),
  warn:    (msg: string, data?: any) => logger.log('warn', msg, data),
  error:   (msg: string, data?: any) => logger.log('error', msg, data),
  debug:   (msg: string, data?: any) => logger.log('debug', msg, data),
  agent:   (msg: string, data?: any) => logger.log('agent', msg, data),
  wallet:  (msg: string, data?: any) => logger.log('wallet', msg, data),
  tx:      (msg: string, data?: any) => logger.log('tx', msg, data),
  separator(): void {
    console.log(chalk.gray('─'.repeat(70)));
  },
  banner(title: string): void {
    console.log('\n' + chalk.bold.cyan('═'.repeat(70)));
    console.log(chalk.bold.cyan(`  ${title}`));
    console.log(chalk.bold.cyan('═'.repeat(70)) + '\n');
  },
};
