import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.unmock('../db');
vi.unmock('../UIRegistryService');
vi.resetModules();

import { UIRegistryService } from '../UIRegistryService';
import { db } from '../db';
import { logger } from '../logger';

describe('UIRegistryService', () => {
  beforeEach(async () => {
    await db.execute('DELETE FROM plugin_ui_registry');
  });

  it('registers and retrieves slots', async () => {
    await UIRegistryService.registerSlot('pwa', 'dashboard.top', 'pwa:Banner', 'prop-1');
    await UIRegistryService.registerSlot('pwa', 'dashboard.top', 'pwa:Banner2'); // system slot

    const slots = await UIRegistryService.getSlots('prop-1');
    expect(slots).toHaveLength(2);
    expect(slots.some((s) => s.componentId === 'pwa:Banner')).toBe(true);
    expect(slots.some((s) => s.componentId === 'pwa:Banner2')).toBe(true);
  });

  it('registers and retrieves menu items', async () => {
    const item = { label: 'My Menu', path: '/my-menu', icon: 'menu-icon' };
    await UIRegistryService.registerMenuItem('pwa', item, 'prop-1');

    const menuItems = await UIRegistryService.getMenuItems('prop-1');
    expect(menuItems).toHaveLength(1);
    expect(menuItems[0].label).toBe('My Menu');
    expect(menuItems[0].path).toBe('/my-menu');
    expect(menuItems[0].icon).toBe('menu-icon');
  });

  it('registers and retrieves dashboard widgets', async () => {
    const widget = {
      id: 'widget-1',
      title: 'Widget 1',
      component: 'WidgetComponent',
      size: 'medium' as any,
    };
    await UIRegistryService.registerDashboardWidget('pwa', widget, 'prop-1');

    const widgets = await UIRegistryService.getDashboardWidgets('prop-1');
    expect(widgets).toHaveLength(1);
    expect(widgets[0].title).toBe('Widget 1');
    expect(widgets[0].componentId).toBe('widget-1');
  });

  it('registers and retrieves settings pages', async () => {
    const page = {
      id: 'page-1',
      label: 'Page 1',
      component: 'PageComponent',
      icon: 'settings-icon',
    };
    await UIRegistryService.registerSettingsPage('pwa', page, 'prop-1');

    const pages = await UIRegistryService.getSettingsPages('prop-1');
    expect(pages).toHaveLength(1);
    expect(pages[0].label).toBe('Page 1');
    expect(pages[0].component).toBe('PageComponent');
  });

  it('handles errors gracefully during registration', async () => {
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
    const dbExecuteSpy = vi
      .spyOn(db, 'execute')
      .mockRejectedValue(new Error('DB registration failed'));

    await UIRegistryService.registerSlot('pwa', 'dashboard.top', 'pwa:Banner');
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to register slot'),
      expect.any(Error)
    );

    await UIRegistryService.registerMenuItem('pwa', { label: 'My Menu', path: '/my-menu' });
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to register menu item'),
      expect.any(Error)
    );

    await UIRegistryService.registerDashboardWidget('pwa', {
      id: 'w1',
      title: 'W1',
      component: 'C1',
    });
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to register dashboard widget'),
      expect.any(Error)
    );

    await UIRegistryService.registerSettingsPage('pwa', { id: 'p1', label: 'P1', component: 'C1' });
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to register settings page'),
      expect.any(Error)
    );

    errorSpy.mockRestore();
    dbExecuteSpy.mockRestore();
  });

  it('handles database query errors gracefully', async () => {
    const dbQuerySpy = vi.spyOn(db, 'query').mockRejectedValue(new Error('DB query failed'));

    const slots = await UIRegistryService.getSlots();
    expect(slots).toEqual([]);

    const menuItems = await UIRegistryService.getMenuItems();
    expect(menuItems).toEqual([]);

    const widgets = await UIRegistryService.getDashboardWidgets();
    expect(widgets).toEqual([]);

    const settingsPages = await UIRegistryService.getSettingsPages();
    expect(settingsPages).toEqual([]);

    dbQuerySpy.mockRestore();
  });
});
