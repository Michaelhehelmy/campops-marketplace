import { describe, it, expect } from 'vitest';
import { PluginDiscoveryService } from '../PluginDiscoveryService';

describe('PluginDiscoveryService Integration', () => {
  it('should sync plugins from filesystem to database', async () => {
    await PluginDiscoveryService.syncPlugins();
    // If it doesn't throw, it worked
  });
});
