import { logger } from './logger';

type ErrorTrackingProvider = {
  init: (dsn: string, env: string) => void;
  captureException: (error: Error, context?: Record<string, unknown>) => void;
};

let provider: ErrorTrackingProvider | null = null;
let initialized = false;

export function initErrorTracking() {
  if (initialized) return;
  initialized = true;

  const dsn = process.env.ERROR_TRACKING_DSN;
  const env = process.env.NODE_ENV || 'development';

  if (!dsn) {
    logger.info('Error tracking: no DSN configured (skipping)');
    return;
  }

  if (dsn.startsWith('https://') && dsn.includes('@sentry')) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Sentry = require('@sentry/nextjs');
      Sentry.init({
        dsn,
        environment: env,
        tracesSampleRate: 0.2,
        sampleRate: 1.0,
      });
      provider = {
        init: () => {},
        captureException: (error, context) => {
          Sentry.captureException(error, { extra: context });
        },
      };
      logger.info('Error tracking: Sentry initialized');
    } catch (err) {
      logger.warn('Error tracking: failed to load @sentry/nextjs:', err);
    }
  } else if (dsn.startsWith('http')) {
    const endpoint = dsn;
    provider = {
      init: () => {},
      captureException: async (error, context) => {
        try {
          await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              error: { message: error.message, stack: error.stack, name: error.name },
              context,
              timestamp: new Date().toISOString(),
              env,
            }),
          });
        } catch {
          // Silently fail
        }
      },
    };
    logger.info('Error tracking: webhook provider initialized');
  } else {
    logger.warn('Error tracking: unrecognized DSN format, no provider loaded');
  }
}

export function captureError(error: Error, context?: Record<string, unknown>) {
  if (provider) {
    try {
      provider.captureException(error, context);
    } catch {
      // Provider failure must not crash the app
    }
  }
  logger.error(error.message, { name: error.name, stack: error.stack, ...context });
}
