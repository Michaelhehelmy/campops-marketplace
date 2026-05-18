import fs from 'fs';
import path from 'path';
import { doAction, Hooks } from './hooks';
import { logger } from './logger';

export interface ThemeManifest {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  version: string;
  author?: string;
  screenshot?: string;
  planRequirement: string;
  templateHierarchy?: Record<string, string[]>;
  widgetAreas?: Array<{ id: string; label: string }>;
  customFields?: Array<{ key: string; label: string; type: string }>;
  supports?: Record<string, boolean>;
}

export interface ResolveTemplateResult {
  themeId: string;
  templateName: string;
  templatePath: string | null;
}

const cache = new Map<string, ThemeManifest>();

/**
 * ThemeLoader — loads and caches theme.json manifests from disk.
 * Resolves template hierarchy for a given post type + context.
 * Fires core:theme:loaded after a theme is loaded for a site.
 */
export class ThemeLoader {
  private static themesRoot = path.join(process.cwd(), 'themes');

  static setThemesRoot(dir: string) {
    ThemeLoader.themesRoot = dir;
  }

  /**
   * Load a theme manifest by ID. Results are cached in-process.
   */
  static load(themeId: string): ThemeManifest | null {
    if (cache.has(themeId)) return cache.get(themeId)!;

    const manifestPath = path.join(ThemeLoader.themesRoot, themeId, 'theme.json');

    if (!fs.existsSync(manifestPath)) {
      logger.warn(`[ThemeLoader] theme.json not found for theme: ${themeId}`);
      return null;
    }

    try {
      const raw = fs.readFileSync(manifestPath, 'utf-8');
      const manifest: ThemeManifest = JSON.parse(raw);
      cache.set(themeId, manifest);
      return manifest;
    } catch (err: any) {
      logger.error(`[ThemeLoader] Failed to parse theme.json for ${themeId}:`, err.message);
      return null;
    }
  }

  /**
   * Resolve the best matching template for a post type + context.
   * Walks the theme's templateHierarchy until a matching template file is found.
   * Falls back to 'default'.
   */
  static resolveTemplate(
    themeId: string,
    postType: string,
    context?: string
  ): ResolveTemplateResult {
    const manifest = ThemeLoader.load(themeId);
    const fallback: ResolveTemplateResult = { themeId, templateName: 'default', templatePath: null };

    if (!manifest) return fallback;

    const hierarchy: string[] = manifest.templateHierarchy?.[postType] ?? ['default'];
    const themeDir = path.join(ThemeLoader.themesRoot, themeId, 'templates');

    for (const candidate of hierarchy) {
      const templatePath = path.join(themeDir, `${candidate}.tsx`);
      if (fs.existsSync(templatePath)) {
        return { themeId, templateName: candidate, templatePath };
      }
      const jsPath = path.join(themeDir, `${candidate}.jsx`);
      if (fs.existsSync(jsPath)) {
        return { themeId, templateName: candidate, templatePath: jsPath };
      }
    }

    return fallback;
  }

  /**
   * Get the widget areas defined by a theme.
   */
  static getWidgetAreas(themeId: string): Array<{ id: string; label: string }> {
    return ThemeLoader.load(themeId)?.widgetAreas ?? [];
  }

  /**
   * Get the custom field definitions supported by a theme.
   * These are the meta keys that theme templates know how to render.
   */
  static getCustomFields(themeId: string): Array<{ key: string; label: string; type: string }> {
    return ThemeLoader.load(themeId)?.customFields ?? [];
  }

  /**
   * Fire the core:theme:loaded action for a given site + theme.
   */
  static async notifyLoaded(siteId: string, themeId: string): Promise<void> {
    await doAction(Hooks.CORE_THEME_LOADED, { siteId, themeId });
  }

  /**
   * Clear the in-memory cache (used in tests).
   */
  static clearCache(): void {
    cache.clear();
  }
}
