import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Logger, logger, getRequestId, runWithRequestId } from '../logger';

describe('Logger', () => {
  let consoleLogSpy: any;
  let consoleErrorSpy: any;
  let consoleWarnSpy: any;
  let consoleDebugSpy: any;
  let consoleInfoSpy: any;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('log levels', () => {
    it('should log at info level', () => {
      const log = new Logger('test');
      log.info('hello world');
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const call = consoleLogSpy.mock.calls[0];
      expect(call[0]).toContain('[INFO]');
      expect(call[0]).toContain('[test]');
      expect(call[1]).toBe('hello world');
    });

    it('should log at warn level', () => {
      const log = new Logger('test');
      log.warn('warning message');
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      const call = consoleWarnSpy.mock.calls[0];
      expect(call[0]).toContain('[WARN]');
      expect(call[0]).toContain('[test]');
      expect(call[1]).toBe('warning message');
    });

    it('should log at error level', () => {
      const log = new Logger('test');
      log.error('error message');
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const call = consoleErrorSpy.mock.calls[0];
      expect(call[0]).toContain('[ERROR]');
      expect(call[0]).toContain('[test]');
      expect(call[1]).toBe('error message');
    });

    it('should log at debug level when minLevel is debug', () => {
      const log = new Logger('test', 'debug');
      log.debug('debug message');
      expect(consoleDebugSpy).toHaveBeenCalledTimes(1);
      const call = consoleDebugSpy.mock.calls[0];
      expect(call[0]).toContain('[DEBUG]');
      expect(call[1]).toBe('debug message');
    });

    it('should not log debug when minLevel is info', () => {
      const log = new Logger('test', 'info');
      log.debug('debug message');
      expect(consoleDebugSpy).not.toHaveBeenCalled();
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should not log trace when minLevel is info', () => {
      const log = new Logger('test', 'info');
      log.trace('trace message');
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should log trace when minLevel is trace', () => {
      const log = new Logger('test', 'trace');
      log.trace('trace message');
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('request ID propagation', () => {
    it('should include request ID in log output when set', () => {
      const log = new Logger('test');
      runWithRequestId('req-123', () => {
        log.info('with request id');
      });
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const call = consoleLogSpy.mock.calls[0];
      expect(call[0]).toContain('[req-123]');
    });

    it('should not include request ID when not set', () => {
      const log = new Logger('test');
      log.info('without request id');
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const call = consoleLogSpy.mock.calls[0];
      expect(call[0]).not.toContain('[req-');
    });

    it('should isolate request IDs between contexts', () => {
      const log = new Logger('test');
      runWithRequestId('req-a', () => {
        log.info('message a');
      });
      runWithRequestId('req-b', () => {
        log.info('message b');
      });
      expect(consoleLogSpy).toHaveBeenCalledTimes(2);
      expect(consoleLogSpy.mock.calls[0][0]).toContain('[req-a]');
      expect(consoleLogSpy.mock.calls[1][0]).toContain('[req-b]');
    });

    it('getRequestId returns undefined outside context', () => {
      expect(getRequestId()).toBeUndefined();
    });

    it('getRequestId returns the ID inside context', () => {
      runWithRequestId('req-456', () => {
        expect(getRequestId()).toBe('req-456');
      });
    });
  });

  describe('child loggers', () => {
    it('should create child logger with namespaced name', () => {
      const parent = new Logger('parent');
      const child = parent.child('child');
      child.info('child message');
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const call = consoleLogSpy.mock.calls[0];
      expect(call[0]).toContain('[parent:child]');
    });
  });

  describe('additional arguments', () => {
    it('should pass additional arguments to console', () => {
      const log = new Logger('test');
      log.info('message', { key: 'value' });
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const call = consoleLogSpy.mock.calls[0];
      expect(call[2]).toEqual({ key: 'value' });
    });

    it('should pass multiple additional arguments', () => {
      const log = new Logger('test');
      log.info('message', 'arg1', 'arg2');
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('production mode', () => {
    it('should output JSON in production mode', () => {
      vi.stubEnv('NODE_ENV', 'production');
      const log = new Logger('test');
      log.info('json message');
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const output = consoleLogSpy.mock.calls[0][0];
      const parsed = JSON.parse(output);
      expect(parsed.level).toBe('info');
      expect(parsed.name).toBe('test');
      expect(parsed.msg).toBe('json message');
      expect(parsed.time).toBeDefined();
      vi.unstubAllEnvs();
    });

    it('should include requestId in JSON output when set', () => {
      vi.stubEnv('NODE_ENV', 'production');
      const log = new Logger('test');
      runWithRequestId('req-json', () => {
        log.info('json with request');
      });
      const output = consoleLogSpy.mock.calls[0][0];
      const parsed = JSON.parse(output);
      expect(parsed.requestId).toBe('req-json');
      vi.unstubAllEnvs();
    });
  });

  describe('default logger singleton', () => {
    it('should be available as a named export', () => {
      expect(logger).toBeInstanceOf(Logger);
    });

    it('should log with campops name', () => {
      logger.info('singleton test');
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const call = consoleLogSpy.mock.calls[0];
      expect(call[0]).toContain('[campops]');
    });
  });
});
