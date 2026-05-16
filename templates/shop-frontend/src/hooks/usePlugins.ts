import { useEffect, useState, useCallback } from "react";
import type { Tenant } from "./useTenant";

const API_BASE = import.meta.env.VITE_API_BASE || "https://api.sinaicamps.com";

export interface PluginAsset {
  asset_type: "script" | "stylesheet" | "icon" | "image" | "config";
  asset_url: string;
  target_location?: string;
  load_order: number;
  cache_duration_seconds: number;
}

export interface Plugin {
  plugin_name: string;
  display_name: string;
  description?: string;
  config: Record<string, any>;
  installed_version: string;
  latest_version?: string;
  manifest: {
    permissions?: string[];
    hooks?: string[];
    [key: string]: any;
  };
  entry_point_url?: string;
  css_url?: string;
  config_schema?: Record<string, any>;
  category?: string;
  icon_url?: string;
  assets: PluginAsset[];
  feature_flags: Record<string, boolean>;
}

interface UsePluginsReturn {
  plugins: Plugin[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  injectAssets: () => void;
}

/**
 * Hook to fetch and manage active plugins for a tenant
 * Handles dynamic injection of plugin scripts and stylesheets
 */
export function usePlugins(tenant: Tenant | null): UsePluginsReturn {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assetsInjected, setAssetsInjected] = useState(false);

  const fetchPlugins = useCallback(async () => {
    if (!tenant?.id) {
      setPlugins([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/api/plugins?propertyId=${tenant.id}`, {
        headers: { Accept: "application/json" },
        mode: "cors",
      });

      if (!response.ok) {
        if (response.status === 404) {
          setPlugins([]);
          return;
        }
        throw new Error(`Failed to fetch plugins: ${response.status}`);
      }

      const data = await response.json();
      setPlugins(data.plugins || []);
    } catch (err) {
      console.error("[usePlugins] Error:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      setPlugins([]);
    } finally {
      setLoading(false);
    }
  }, [tenant?.id]);

  /**
   * Inject plugin assets (scripts and stylesheets) into the DOM
   */
  const injectAssets = useCallback(() => {
    if (assetsInjected || !plugins.length) return;

    plugins.forEach((plugin) => {
      // Sort assets by load_order
      const sortedAssets = [...plugin.assets].sort((a, b) => a.load_order - b.load_order);

      sortedAssets.forEach((asset) => {
        // Skip if already injected (check by data attribute)
        const existing = document.querySelector(
          `[data-plugin-asset="${plugin.plugin_name}:${asset.asset_url}"]`
        );
        if (existing) return;

        if (asset.asset_type === "script") {
          const script = document.createElement("script");
          script.src = asset.asset_url;
          script.async = true;
          script.setAttribute("data-plugin-asset", `${plugin.plugin_name}:${asset.asset_url}`);
          script.setAttribute("data-plugin-name", plugin.plugin_name);

          // Inject based on target_location
          const target = asset.target_location === "head" ? document.head : document.body;
          target.appendChild(script);

          console.log(
            `[PluginLoader] Injected script: ${asset.asset_url} for ${plugin.plugin_name}`
          );
        } else if (asset.asset_type === "stylesheet") {
          const link = document.createElement("link");
          link.rel = "stylesheet";
          link.href = asset.asset_url;
          link.setAttribute("data-plugin-asset", `${plugin.plugin_name}:${asset.asset_url}`);
          link.setAttribute("data-plugin-name", plugin.plugin_name);

          document.head.appendChild(link);

          console.log(
            `[PluginLoader] Injected stylesheet: ${asset.asset_url} for ${plugin.plugin_name}`
          );
        }
      });

      // Also handle entry_point_url and css_url if present
      if (
        plugin.entry_point_url &&
        !document.querySelector(`[data-plugin-entry="${plugin.plugin_name}"]`)
      ) {
        const script = document.createElement("script");
        script.src = plugin.entry_point_url;
        script.async = true;
        script.setAttribute("data-plugin-entry", plugin.plugin_name);
        script.setAttribute("data-plugin-name", plugin.plugin_name);
        script.setAttribute("data-plugin-config", JSON.stringify(plugin.config));
        document.body.appendChild(script);

        console.log(
          `[PluginLoader] Injected entry point: ${plugin.entry_point_url} for ${plugin.plugin_name}`
        );
      }

      if (plugin.css_url && !document.querySelector(`[data-plugin-css="${plugin.plugin_name}"]`)) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = plugin.css_url;
        link.setAttribute("data-plugin-css", plugin.plugin_name);
        link.setAttribute("data-plugin-name", plugin.plugin_name);
        document.head.appendChild(link);

        console.log(`[PluginLoader] Injected CSS: ${plugin.css_url} for ${plugin.plugin_name}`);
      }
    });

    setAssetsInjected(true);
  }, [plugins, assetsInjected]);

  useEffect(() => {
    fetchPlugins();
  }, [fetchPlugins]);

  // Auto-inject assets once plugins are loaded
  useEffect(() => {
    if (plugins.length > 0 && !assetsInjected) {
      injectAssets();
    }
  }, [plugins, assetsInjected, injectAssets]);

  return {
    plugins,
    loading,
    error,
    refetch: fetchPlugins,
    injectAssets,
  };
}

export default usePlugins;
