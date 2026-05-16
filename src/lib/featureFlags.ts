import { db } from './db.js';
import { logger } from './logger.js';

/**
 * Checks if a feature flag is enabled in the database.
 */
export async function checkFlag(name: string): Promise<boolean> {
  try {
    const flag = await db.prepare('SELECT is_enabled FROM feature_flags WHERE name = ?').get(name);
    return !!flag?.is_enabled;
  } catch (err) {
    logger.error(`Error checking flag ${name}:`, err);
    return false;
  }
}
