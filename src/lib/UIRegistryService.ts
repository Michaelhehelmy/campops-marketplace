import { db } from './db';
import { logger } from './logger';

export interface SlotRegistration {
  pluginId: string;
  slotName: string;
  componentId: string;
  propertyId?: string;
  createdAt: string;
}

export interface MenuItem {
  id: string;
  pluginId: string;
  label: string;
  icon?: string;
  path: string;
  order?: number;
  propertyId?: string;
}

export interface DashboardWidget {
  id: string;
  pluginId: string;
  title: string;
  componentId: string;
  size?: 'small' | 'medium' | 'large';
  order?: number;
  propertyId?: string;
}

export interface SettingsPage {
  id: string;
  pluginId: string;
  label: string;
  icon?: string;
  component: string;
  propertyId?: string;
}

export class UIRegistryService {
  static async registerSlot(
    pluginId: string,
    slotName: string,
    componentId: string,
    propertyId?: string
  ): Promise<void> {
    try {
      const id = `slot_${pluginId}_${slotName}_${propertyId || 'system'}`;
      await db.execute(
        `INSERT OR REPLACE INTO plugin_ui_registry (id, plugin_id, slot_name, component_id, property_id, created_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'))`,
        [id, pluginId, slotName, componentId, propertyId || null]
      );
      logger.info(`Registered slot: ${slotName} -> ${componentId} (plugin: ${pluginId})`);
    } catch (err) {
      logger.error(`Failed to register slot ${slotName}:`, err);
    }
  }

  static async registerMenuItem(
    pluginId: string,
    item: { label: string; icon?: string; path: string; permission?: string },
    propertyId?: string
  ): Promise<void> {
    try {
      const itemId = item.label.toLowerCase().replace(/\s+/g, '-');
      const rid = `menu_${pluginId}_${itemId}_${propertyId || 'system'}`;
      await db.execute(
        `INSERT OR REPLACE INTO plugin_ui_registry (id, plugin_id, slot_name, component_id, property_id, config, created_at)
         VALUES (?, ?, 'menu_item', ?, ?, ?, datetime('now'))`,
        [rid, pluginId, itemId, propertyId || null, JSON.stringify(item)]
      );
      logger.info(`Registered menu item: ${item.label} (plugin: ${pluginId})`);
    } catch (err) {
      logger.error(`Failed to register menu item ${item.label}:`, err);
    }
  }

  static async registerDashboardWidget(
    pluginId: string,
    widget: { id: string; title: string; component: string; width?: string },
    propertyId?: string
  ): Promise<void> {
    try {
      const rid = `widget_${pluginId}_${widget.id}_${propertyId || 'system'}`;
      await db.execute(
        `INSERT OR REPLACE INTO plugin_ui_registry (id, plugin_id, slot_name, component_id, property_id, config, created_at)
         VALUES (?, ?, 'dashboard_widget', ?, ?, ?, datetime('now'))`,
        [rid, pluginId, widget.id, propertyId || null, JSON.stringify(widget)]
      );
      logger.info(`Registered dashboard widget: ${widget.title} (plugin: ${pluginId})`);
    } catch (err) {
      logger.error(`Failed to register dashboard widget ${widget.id}:`, err);
    }
  }

  static async registerSettingsPage(
    pluginId: string,
    page: { id: string; label: string; icon?: string; component: string },
    propertyId?: string
  ): Promise<void> {
    try {
      const rid = `settings_${pluginId}_${page.id}_${propertyId || 'system'}`;
      await db.execute(
        `INSERT OR REPLACE INTO plugin_ui_registry (id, plugin_id, slot_name, component_id, property_id, config, created_at)
         VALUES (?, ?, 'settings_page', ?, ?, ?, datetime('now'))`,
        [rid, pluginId, page.id, propertyId || null, JSON.stringify(page)]
      );
      logger.info(`Registered settings page: ${page.label} (plugin: ${pluginId})`);
    } catch (err) {
      logger.error(`Failed to register settings page ${page.id}:`, err);
    }
  }

  static async getSlots(propertyId?: string): Promise<SlotRegistration[]> {
    try {
      const rows = await db.query(
        `SELECT * FROM plugin_ui_registry WHERE slot_name NOT IN ('menu_item', 'dashboard_widget', 'settings_page')
         ${propertyId ? 'AND (property_id = ? OR property_id IS NULL)' : ''}
         ORDER BY created_at ASC`,
        propertyId ? [propertyId] : []
      );
      return rows.map((r: any) => ({
        pluginId: r.plugin_id,
        slotName: r.slot_name,
        componentId: r.component_id,
        propertyId: r.property_id,
        createdAt: r.created_at,
      }));
    } catch {
      return [];
    }
  }

  static async getMenuItems(propertyId?: string): Promise<MenuItem[]> {
    try {
      const rows = await db.query(
        `SELECT * FROM plugin_ui_registry WHERE slot_name = 'menu_item'
         ${propertyId ? 'AND (property_id = ? OR property_id IS NULL)' : ''}
         ORDER BY created_at ASC`,
        propertyId ? [propertyId] : []
      );
      return rows.map((r: any) => {
        const config = JSON.parse(r.config || '{}');
        return {
          id: config.id || r.component_id,
          pluginId: r.plugin_id,
          label: config.label || '',
          icon: config.icon,
          path: config.path || '',
          order: config.order,
          propertyId: r.property_id,
        };
      });
    } catch {
      return [];
    }
  }

  static async getDashboardWidgets(propertyId?: string): Promise<DashboardWidget[]> {
    try {
      const rows = await db.query(
        `SELECT * FROM plugin_ui_registry WHERE slot_name = 'dashboard_widget'
         ${propertyId ? 'AND (property_id = ? OR property_id IS NULL)' : ''}
         ORDER BY created_at ASC`,
        propertyId ? [propertyId] : []
      );
      return rows.map((r: any) => {
        const config = JSON.parse(r.config || '{}');
        return {
          id: config.id || r.component_id,
          pluginId: r.plugin_id,
          title: config.title || '',
          componentId: config.componentId || r.component_id,
          size: config.size,
          order: config.order,
          propertyId: r.property_id,
        };
      });
    } catch {
      return [];
    }
  }

  static async getSettingsPages(propertyId?: string): Promise<SettingsPage[]> {
    try {
      const rows = await db.query(
        `SELECT * FROM plugin_ui_registry WHERE slot_name = 'settings_page'
         ${propertyId ? 'AND (property_id = ? OR property_id IS NULL)' : ''}
         ORDER BY created_at ASC`,
        propertyId ? [propertyId] : []
      );
      return rows.map((r: any) => {
        const config = JSON.parse(r.config || '{}');
        return {
          id: config.id || r.component_id,
          pluginId: r.plugin_id,
          label: config.label || '',
          icon: config.icon,
          component: config.component || r.component_id,
          propertyId: r.property_id,
        };
      });
    } catch {
      return [];
    }
  }
}
