/**
 * CampOps Plugin SDK – Public API surface exposed to all plugins.
 *
 * A plugin is a Node.js module that exports a default function:
 *   export default function init(api: PluginAPI): void | Promise<void>
 *
 * The PluginAPI object is the ONLY thing a plugin should import from the core.
 * Plugins must not import directly from server/* paths.
 */
export {};
