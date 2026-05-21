import { logger } from './logger';

process.on('unhandledRejection', (reason: unknown) => {
  logger.error(
    'Unhandled Rejection (likely from a plugin):',
    reason instanceof Error ? reason.message : reason,
    reason instanceof Error ? reason.stack : undefined
  );
});
