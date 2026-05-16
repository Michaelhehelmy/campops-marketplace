import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PluginDiscoveryService } from '../PluginDiscoveryService';
import fs from 'fs/promises';
import { db } from '../db';

vi.mock('fs/promises');
vi.mock('../db');

describe('PluginDiscoveryService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (db.query as any).mockResolvedValue([]);
  });

  it('should skip folders without plugin.json', async () => {
    (fs.readdir as any).mockResolvedValue([{ isDirectory: () => true, name: 'plugin-a' }]);
    (fs.access as any).mockRejectedValue({ code: 'ENOENT' });

    const consoleSpy = vi.spyOn(console, 'log');
    await PluginDiscoveryService.syncPlugins();

    expect(db.prepare).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[campops]'),
      expect.stringContaining('Synchronisation complete')
    );
  });

  it('should handle invalid JSON in plugin.json', async () => {
    (fs.readdir as any).mockResolvedValue([{ isDirectory: () => true, name: 'plugin-invalid' }]);
    (fs.access as any).mockResolvedValue(undefined);
    (fs.readFile as any).mockResolvedValue('invalid json');

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await PluginDiscoveryService.syncPlugins();

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[campops]'),
      expect.stringContaining('Error processing plugin-invalid'),
      expect.any(Error)
    );
  });

  it('should handle error in readdir', async () => {
    (fs.readdir as any).mockRejectedValue(new Error('Read error'));

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await PluginDiscoveryService.syncPlugins();

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[campops]'),
      expect.stringContaining('Error during sync:'),
      expect.any(Error)
    );
  });

  it('should upsert plugin data into database', async () => {
    (fs.readdir as any).mockResolvedValue([{ isDirectory: () => true, name: 'pwa' }]);
    (fs.access as any).mockResolvedValue(undefined);
    const manifest = {
      id: 'pwa-plugin',
      name: 'PWA Plugin',
      description: 'Progressive Web App',
      category: 'marketing',
      version: '1.0.0',
      entry: 'index.js',
    };
    (fs.readFile as any).mockResolvedValue(JSON.stringify(manifest));

    const mockRun = vi.fn().mockResolvedValue({ changes: 1 });
    (db.prepare as any).mockReturnValue({ run: mockRun });

    await PluginDiscoveryService.syncPlugins();

    expect(db.prepare).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO available_plugins')
    );
    expect(mockRun).toHaveBeenCalledWith(
      'pwa-plugin',
      'PWA Plugin',
      'Progressive Web App',
      'marketing',
      JSON.stringify(manifest),
      'index.js',
      '{}'
    );
  });

  it('should deactivate missing plugins', async () => {
    // Mock empty directory
    (fs.readdir as any).mockResolvedValue([]);

    // Mock DB with existing plugins
    (db.query as any).mockResolvedValue([{ name: 'old-plugin' }]);

    const mockRun = vi.fn();
    (db.prepare as any).mockReturnValue({ run: mockRun });

    await PluginDiscoveryService.syncPlugins();

    expect(db.prepare).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE available_plugins SET is_active = 0')
    );
    expect(mockRun).toHaveBeenCalledWith('old-plugin');
  });
});
