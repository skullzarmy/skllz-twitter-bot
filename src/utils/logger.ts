type LogLevel = 'info' | 'error' | 'warn' | 'debug';

interface LoggerOptions {
  timestamp?: boolean;
  level?: LogLevel;
}

class Logger {
  private options: Required<LoggerOptions>;

  constructor(options: LoggerOptions = {}) {
    this.options = {
      timestamp: options.timestamp ?? true,
      level: options.level ?? 'info',
    };
  }

  private formatMessage(level: string): string {
    const timestamp = this.options.timestamp
      ? `[${new Date().toISOString()}]`
      : '';
    const levelTag = `[${level.toUpperCase()}]`;

    return `${timestamp} ${levelTag}`;
  }

  info(...args: unknown[]): void {
    console.log(this.formatMessage('info'), ...args);
  }

  error(...args: unknown[]): void {
    console.error(this.formatMessage('error'), ...args);
  }

  warn(...args: unknown[]): void {
    console.warn(this.formatMessage('warn'), ...args);
  }

  debug(...args: unknown[]): void {
    if (this.options.level === 'debug') {
      console.log(this.formatMessage('debug'), ...args);
    }
  }
}

export const logger = new Logger({
  level: process.env.BOT_DEBUG === 'true' ? 'debug' : 'info',
});
