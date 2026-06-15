type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private isDev = process.env.NODE_ENV === 'development';
  private isTest = process.env.NODE_ENV === 'test';

  private shouldLog(level: LogLevel): boolean {
    if (this.isTest) return false;
    if (level === 'debug') return this.isDev;
    return true;
  }

  debug(message: string, ...args: unknown[]) {
    if (this.shouldLog('debug')) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }

  info(message: string, ...args: unknown[]) {
    if (this.shouldLog('info')) {
      console.log(`[INFO] ${message}`, ...args);
    }
  }

  warn(message: string, ...args: unknown[]) {
    if (this.shouldLog('warn')) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  }

  error(message: string, ...args: unknown[]) {
    if (this.shouldLog('error')) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  }
}

export const logger = new Logger();
export type { Logger };
