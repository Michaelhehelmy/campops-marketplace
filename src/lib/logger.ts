export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
};

let _AsyncLocalStorage: any = null;
function getAsyncLocalStorage(): any {
  if (_AsyncLocalStorage !== null) return _AsyncLocalStorage;
  // Only attempt to require async_hooks in Node.js environments
  if (typeof window === 'undefined') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      _AsyncLocalStorage = require('async_hooks').AsyncLocalStorage;
    } catch {
      _AsyncLocalStorage = undefined;
    }
  } else {
    _AsyncLocalStorage = undefined;
  }
  return _AsyncLocalStorage;
}

let _requestContext: any = undefined;
function getRequestContext(): any {
  if (_requestContext !== undefined) return _requestContext;
  const ALS = getAsyncLocalStorage();
  if (ALS) {
    _requestContext = new ALS();
  } else {
    _requestContext = null;
  }
  return _requestContext;
}

export function getRequestId(): string | undefined {
  const ctx = getRequestContext();
  return ctx?.getStore?.()?.requestId;
}

export function runWithRequestId<T>(requestId: string, fn: () => T): T {
  const ctx = getRequestContext();
  if (ctx) {
    return ctx.run({ requestId }, fn);
  }
  return fn();
}

export class Logger {
  private name: string;
  private minLevel: LogLevel;

  constructor(name: string, minLevel: LogLevel = 'info') {
    this.name = name;
    this.minLevel = minLevel;
  }

  private log(level: LogLevel, message: string, ...args: unknown[]) {
    if (LOG_LEVELS[level] < LOG_LEVELS[this.minLevel]) return;

    const requestId = getRequestId();
    const entry: Record<string, unknown> = {
      level,
      name: this.name,
      msg: message,
      time: new Date().toISOString(),
    };

    if (requestId) {
      entry.requestId = requestId;
    }

    if (args.length === 1) {
      entry.data = args[0];
    } else if (args.length > 1) {
      entry.data = args;
    }

    const isProd = process.env.NODE_ENV === 'production';
    if (isProd) {
      const method = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
      console[method](JSON.stringify(entry));
    } else {
      const prefix = `[${entry.time}] [${level.toUpperCase()}] [${this.name}]${requestId ? ` [${requestId}]` : ''}`;
      const method =
        level === 'error'
          ? 'error'
          : level === 'warn'
            ? 'warn'
            : level === 'debug'
              ? 'debug'
              : 'log';
      console[method](prefix, message, ...args);
    }
  }

  trace(message: string, ...args: unknown[]) {
    this.log('trace', message, ...args);
  }
  debug(message: string, ...args: unknown[]) {
    this.log('debug', message, ...args);
  }
  info(message: string, ...args: unknown[]) {
    this.log('info', message, ...args);
  }
  warn(message: string, ...args: unknown[]) {
    this.log('warn', message, ...args);
  }
  error(message: string, ...args: unknown[]) {
    this.log('error', message, ...args);
  }

  child(name: string): Logger {
    return new Logger(`${this.name}:${name}`, this.minLevel);
  }
}

export const logger = new Logger('sinaicamps');
