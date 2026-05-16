'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

export interface PluginMenuItem {
  id: string;
  label: string;
  icon?: string;
  path: string;
  order?: number;
  pluginId: string;
}

export interface PluginAdminPage {
  title: string;
  path: string;
  table: string;
  columns: string[];
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  pluginId: string;
}

export interface PluginUIRegistry {
  uiVersion: string;
  slots: Record<string, string[]>;
  menuItems: PluginMenuItem[];
  dashboardWidgets: any[];
  settingsPages: any[];
  adminPages: PluginAdminPage[];
}

interface PluginContextType {
  registry: PluginUIRegistry | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

const PluginContext = createContext<PluginContextType | undefined>(undefined);

export function PluginRegistryProvider({
  children,
  initialRegistry,
}: {
  children: React.ReactNode;
  initialRegistry?: PluginUIRegistry;
}) {
  const params = useParams();
  const propertyId = (params?.propertyId || params?.listingId || params?.slug) as string;

  const [registry, setRegistry] = useState<PluginUIRegistry | null>(initialRegistry || null);
  const [loading, setLoading] = useState(!initialRegistry);
  const [error, setError] = useState<Error | null>(null);

  const fetchRegistry = async () => {
    try {
      setLoading(true);
      // In a real app, we might get propertyId from context or URL
      // For now we'll try to fetch without it if not available, or mock it
      const url = propertyId
        ? `/api/plugins/ui-registry?propertyId=${propertyId}`
        : '/api/plugins/ui-registry'; // Backend might fall back to session/header

      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error(`Failed to fetch UI registry: ${res.statusText}`);

      const data = await res.json();
      setRegistry(data);
      setError(null);
    } catch (err: any) {
      console.error('[PluginRegistryProvider] Failed to fetch registry:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistry();
  }, [propertyId]);

  return (
    <PluginContext.Provider value={{ registry, loading, error, refresh: fetchRegistry }}>
      {children}
    </PluginContext.Provider>
  );
}

export function usePluginRegistry() {
  const context = useContext(PluginContext);
  if (context === undefined) {
    throw new Error('usePluginRegistry must be used within a PluginRegistryProvider');
  }
  return context;
}

export function usePluginMenuItems() {
  const { registry } = usePluginRegistry();
  return registry?.menuItems || [];
}

export function usePluginAdminPages() {
  const { registry } = usePluginRegistry();
  return registry?.adminPages || [];
}

export function usePluginSlot(slotName: string) {
  const { registry } = usePluginRegistry();
  const keys = registry?.slots[slotName] || [];
  return keys;
}
