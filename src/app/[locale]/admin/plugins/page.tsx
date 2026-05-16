'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Puzzle,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Settings2,
  ExternalLink,
  ChevronRight,
  Info,
} from 'lucide-react';

interface Plugin {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: string;
  isActive: boolean;
  isOfficial: boolean;
  version: string;
}

export default function MasterPluginsPage() {
  const searchParams = useSearchParams();
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [propertyAssociations, setPropertyAssociations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [shopsLoaded, setShopsLoaded] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedProperty, setSelectedProperty] = useState<string>(() => {
    // Initialize from URL query param, localStorage, or default to 'all'
    const urlParam = searchParams.get('property');
    if (urlParam) return urlParam;
    const saved =
      typeof window !== 'undefined' ? localStorage.getItem('admin-selected-property') : null;
    return saved || 'all';
  });
  const [shops, setShops] = useState<any[]>([]);
  const [view, setView] = useState<'catalog' | 'properties'>('catalog');

  useEffect(() => {
    fetchPlugins();
    fetch('/api/master/listings')
      .then((res) => res.json())
      .then((data) => {
        const listings = data.listings || [];
        setShops(listings);
        setShopsLoaded(true);
      })
      .catch(() => setShopsLoaded(true));
  }, []);

  // Save selected property to localStorage when it changes
  useEffect(() => {
    if (selectedProperty) {
      localStorage.setItem('admin-selected-property', selectedProperty);
      console.log('[AdminPlugins] Saved selected property to localStorage:', selectedProperty);
    }
  }, [selectedProperty]);

  const fetchPlugins = async () => {
    try {
      const res = await fetch('/api/master/plugins');
      const data = await res.json();
      setPlugins(data.plugins || []);
      setPropertyAssociations(data.propertyAssociations || []);
    } catch (err) {
      console.error('Failed to fetch plugins:', err);
    } finally {
      setLoading(false);
    }
  };

  const isPluginEnabledForProperty = (pluginName: string, propertyId: string) => {
    if (propertyId === 'all') return false;
    return propertyAssociations.some(
      (a) => a.pluginName === pluginName && a.propertyId === propertyId && a.isEnabled
    );
  };

  const getPluginEnabledState = (plugin: Plugin) => {
    if (selectedProperty === 'all') {
      return plugin.isActive;
    }
    return isPluginEnabledForProperty(plugin.name, selectedProperty);
  };

  const togglePlugin = async (pluginId: string, propertyId?: string) => {
    const plugin = plugins.find((p) => p.id === pluginId || p.name === pluginId);
    if (!plugin) return;

    const targetProperty = propertyId || selectedProperty;
    const currentlyEnabled = propertyId
      ? isPluginEnabledForProperty(plugin.name, propertyId)
      : getPluginEnabledState(plugin);

    try {
      const res = await fetch('/api/master/plugins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pluginId: plugin.name,
          propertyId: targetProperty,
          enabled: !currentlyEnabled,
        }),
      });
      if (res.ok) {
        fetchPlugins();
      }
    } catch (err) {
      console.error('Failed to toggle plugin:', err);
    }
  };

  if (loading || !shopsLoaded) {
    return (
      <div className="space-y-8 animate-pulse p-8">
        <div className="h-10 w-64 bg-gray-100 rounded-xl mb-4"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-3xl"></div>
          ))}
        </div>
        <div className="h-96 bg-gray-100 rounded-[2.5rem]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 ">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Plugin Management</h1>
          <p className="text-gray-500">Manage global plugin availability and updates.</p>

          <div className="flex gap-4 mt-6">
            <button
              onClick={() => setView('catalog')}
              className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${view === 'catalog' ? 'bg-purple-600 text-white shadow-lg' : 'bg-white text-gray-500 border border-gray-100'}`}
            >
              Plugin Catalog
            </button>
            <button
              onClick={() => setView('properties')}
              className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${view === 'properties' ? 'bg-purple-600 text-white shadow-lg' : 'bg-white text-gray-500 border border-gray-100'}`}
            >
              Per-Property Plugins
            </button>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 bg-slate-100 text-slate-900 px-6 py-3 rounded-2xl font-bold hover:bg-slate-200 transition-all">
            <Info className="h-5 w-5" /> Documentation
          </button>
          <button className="flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-purple-700 transition-all shadow-xl shadow-purple-200">
            <Puzzle className="h-5 w-5" /> Sync Registry
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatsTile label="Total Plugins" value={plugins.length} color="purple" />
        <StatsTile label="Active Installs" value={shops.length * 3} color="blue" />
        <StatsTile label="Beta Features" value={3} color="orange" />
        <StatsTile label="System Updates" value={0} color="green" />
      </div>

      {/* Property filter combobox */}
      <div className="mb-4">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <select
            value={selectedProperty}
            onChange={(e) => setSelectedProperty(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
          >
            <option value="all">All Properties</option>
            {shops.map((shop) => (
              <option key={shop.id} value={shop.id}>
                {shop.name} ({shop.slug})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-8">
        {view === 'catalog' ? (
          <>
            <div className="w-64 space-y-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Filter plugins..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-100 focus:border-purple-200 transition-all outline-none text-sm"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 px-2">
                  Categories
                </h4>
                {['All', 'Core', 'Commerce', 'Operations', 'Marketing'].map((cat) => (
                  <button
                    key={cat}
                    className="w-full text-left px-4 py-2 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 transition-all"
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 grid grid-cols-1 xl:grid-cols-2 gap-6">
              {plugins.map((plugin) => {
                const isEnabled = getPluginEnabledState(plugin);
                return (
                  <div
                    key={plugin.name}
                    aria-label={plugin.displayName}
                    role="region"
                    className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/40 hover:border-purple-200 transition-all group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-6">
                        <div className="h-14 w-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center text-purple-600">
                          <Puzzle className="h-8 w-8" />
                        </div>
                        <div className="flex gap-2">
                          <span
                            className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                              isEnabled
                                ? 'bg-green-100 text-green-600'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {isEnabled ? 'Enabled' : 'Disabled'}
                          </span>
                          {plugin.isOfficial && (
                            <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-purple-100 text-purple-600">
                              Official
                            </span>
                          )}
                        </div>
                      </div>

                      <h3 className="text-xl font-black text-gray-900 group-hover:text-purple-600 transition-colors">
                        {plugin.displayName || plugin.name}
                      </h3>
                      <p className="text-gray-500 text-sm mt-2 mb-6 leading-relaxed">
                        {plugin.description || 'No description provided.'}
                      </p>

                      <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="bg-gray-50 p-4 rounded-2xl">
                          <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">
                            Category
                          </div>
                          <div className="font-black text-gray-900">
                            {plugin.category || 'Utility'}
                          </div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-2xl">
                          <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">
                            Version
                          </div>
                          <div className="font-black text-gray-900">
                            v{plugin.version || '1.0.0'}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-6 border-t border-gray-50">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-slate-900 flex items-center justify-center text-[10px] text-white font-bold">
                          C
                        </div>
                        <span className="text-xs font-bold text-gray-600">CampOps Registry</span>
                      </div>
                      <div className="flex gap-2">
                        {selectedProperty === 'all' && (
                          <button
                            onClick={() => togglePlugin(plugin.id)}
                            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                              isEnabled
                                ? 'bg-red-50 text-red-600 hover:bg-red-100'
                                : 'bg-green-50 text-green-600 hover:bg-green-100'
                            }`}
                          >
                            {isEnabled ? `Disable Globally` : `Enable Globally`}
                          </button>
                        )}
                        <button
                          onClick={() => togglePlugin(plugin.id)}
                          className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                            isEnabled
                              ? 'bg-red-50 text-red-600 hover:bg-red-100'
                              : 'bg-green-50 text-green-600 hover:bg-green-100'
                          }`}
                        >
                          {isEnabled
                            ? `Disable ${plugin.displayName || plugin.name} plugin`
                            : `Enable ${plugin.displayName || plugin.name} plugin`}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="flex-1 bg-white rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/40 overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
                    Property
                  </th>
                  <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
                    Active Plugins
                  </th>
                  <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {shops.map((shop) => (
                  <tr key={shop.id} className="hover:bg-gray-50 transition-all" role="row">
                    <td className="px-8 py-6">
                      <div className="font-bold text-gray-900">{shop.name}</div>
                      <div className="text-xs text-gray-400">{shop.slug}</div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-wrap gap-2">
                        {plugins
                          .filter((p) => isPluginEnabledForProperty(p.name, shop.id))
                          .map((p) => (
                            <span
                              key={p.name}
                              className="px-2 py-1 bg-purple-50 text-purple-600 text-[10px] font-bold rounded-lg border border-purple-100"
                            >
                              {p.displayName || p.name}
                            </span>
                          ))}
                        {plugins.filter((p) => isPluginEnabledForProperty(p.name, shop.id))
                          .length === 0 && (
                          <span className="text-[10px] text-gray-400 italic">
                            No plugins enabled
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex justify-end gap-2">
                        {plugins.map((p) => {
                          const isEnabled = isPluginEnabledForProperty(p.name, shop.id);
                          return (
                            <button
                              key={p.name}
                              onClick={() => togglePlugin(p.id, shop.id)}
                              className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${isEnabled ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                            >
                              {isEnabled
                                ? `Disable ${p.displayName || p.name}`
                                : `Enable ${p.displayName || p.name}`}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatsTile({ label, value, color }: any) {
  const colors: any = {
    purple: 'text-purple-600',
    blue: 'text-blue-600',
    orange: 'text-orange-600',
    green: 'text-green-600',
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm text-center">
      <div className={`text-3xl font-black ${colors[color]}`}>{value}</div>
      <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
        {label}
      </div>
    </div>
  );
}
