'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Package, CheckCircle, XCircle, AlertCircle, Loader2, Search } from 'lucide-react';

interface PluginEntry {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  version: string;
  planRequirement: string;
  installed: boolean;
  activatedAt: number | null;
}

const PLAN_BADGE: Record<string, { label: string; color: string }> = {
  basic: { label: 'Basic', color: 'bg-slate-100 text-slate-700' },
  premium: { label: 'Premium', color: 'bg-amber-100 text-amber-800' },
  ultimate: { label: 'Ultimate', color: 'bg-purple-100 text-purple-800' },
};

export default function PluginsPage() {
  const params = useParams();
  const listingId = params.listingId as string;

  const [plugins, setPlugins] = useState<PluginEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'installed' | 'available'>('all');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [sitePlan, setSitePlan] = useState('basic');
  const [toast, setToast] = useState<{ message: string; ok: boolean } | null>(null);

  const showToast = (message: string, ok: boolean) => {
    setToast({ message, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const loadPlugins = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/site/plugins?siteId=${listingId}&plan=${sitePlan}`);
      if (!res.ok) throw new Error('Failed to load plugins');
      const data = await res.json();
      setPlugins(data.plugins ?? []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [listingId, sitePlan]);

  useEffect(() => {
    fetch(`/api/listing-access?listing=${listingId}`)
      .then((r) => r.json())
      .then((data) => setSitePlan(data.plan ?? 'basic'))
      .catch(() => {})
      .finally(() => loadPlugins());
  }, [listingId, loadPlugins]);

  const handleInstall = async (pluginId: string) => {
    setActionInProgress(pluginId);
    try {
      const res = await fetch('/api/site/plugins/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId: listingId, pluginId, plan: sitePlan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Install failed');
      showToast(`Plugin installed successfully.`, true);
      await loadPlugins();
    } catch (err: any) {
      showToast(err.message, false);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleUninstall = async (pluginId: string) => {
    setActionInProgress(pluginId);
    try {
      const res = await fetch(`/api/site/plugins/${pluginId}?siteId=${listingId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Uninstall failed');
      showToast(`Plugin deactivated.`, true);
      await loadPlugins();
    } catch (err: any) {
      showToast(err.message, false);
    } finally {
      setActionInProgress(null);
    }
  };

  const filtered = plugins.filter((p) => {
    if (filter === 'installed' && !p.installed) return false;
    if (filter === 'available' && p.installed) return false;
    if (search && !p.displayName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="w-6 h-6 text-indigo-600" />
            Plugin Store
          </h1>
          <p className="text-gray-500 mt-1">
            Extend your site with plugins. Current plan:{' '}
            <span className="font-medium capitalize">{sitePlan}</span>.
          </p>
        </div>

        {/* Toast */}
        {toast && (
          <div
            className={`mb-4 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium ${toast.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}
          >
            {toast.ok ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            {toast.message}
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search plugins…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
            {(['all', 'installed', 'available'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 capitalize ${filter === f ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading plugins…
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-lg p-4">
            <AlertCircle className="w-5 h-5" /> {error}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">No plugins match your search.</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {filtered.map((plugin) => {
              const badge = PLAN_BADGE[plugin.planRequirement] ?? PLAN_BADGE.basic;
              const inProgress = actionInProgress === plugin.id;
              const canInstall =
                ['basic', 'premium', 'ultimate'].indexOf(sitePlan) >=
                ['basic', 'premium', 'ultimate'].indexOf(plugin.planRequirement);

              return (
                <div
                  key={plugin.id}
                  className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900 text-sm">
                          {plugin.displayName}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.color}`}
                        >
                          {badge.label}
                        </span>
                        {plugin.installed && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                            Installed
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">v{plugin.version}</p>
                    </div>
                  </div>

                  {plugin.description && (
                    <p className="text-sm text-gray-600 leading-relaxed">{plugin.description}</p>
                  )}

                  <div className="mt-auto">
                    {plugin.installed ? (
                      <button
                        onClick={() => handleUninstall(plugin.id)}
                        disabled={inProgress}
                        className="w-full text-sm py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {inProgress ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <XCircle className="w-4 h-4" />
                        )}
                        Deactivate
                      </button>
                    ) : canInstall ? (
                      <button
                        onClick={() => handleInstall(plugin.id)}
                        disabled={inProgress}
                        className="w-full text-sm py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {inProgress ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                        Install
                      </button>
                    ) : (
                      <div className="text-xs text-center text-amber-700 bg-amber-50 rounded-lg py-2 px-3">
                        Requires{' '}
                        <span className="font-semibold capitalize">{plugin.planRequirement}</span>{' '}
                        plan
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
