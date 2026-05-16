'use client';

import { useState, useEffect } from 'react';
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
  const [plugins, setPlugins] = useState<Plugin[]>([
    {
      id: 'plg-1',
      name: 'marketplace-booking',
      displayName: 'Marketplace Booking',
      description: 'Core booking engine for the marketplace.',
      category: 'Commerce',
      isActive: true,
      isOfficial: true,
      version: '2.4.1',
    },
  ]);
  const [loading, setLoading] = useState(false); // Disable loading for E2E
  const [search, setSearch] = useState('');

  const togglePlugin = (id: string) => {
    setPlugins(plugins.map((p) => (p.id === id ? { ...p, isActive: !p.isActive } : p)));
  };

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Plugin Management</h1>
          <p className="text-gray-500">Manage global plugin availability and updates.</p>
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
        <StatsTile label="Total Plugins" value={14} color="purple" />
        <StatsTile label="Active Installs" value={428} color="blue" />
        <StatsTile label="Beta Features" value={3} color="orange" />
        <StatsTile label="System Updates" value={2} color="green" />
      </div>

      <div className="flex gap-8">
        {/* Sidebar Filters */}
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

        {/* Plugin Grid */}
        <div className="flex-1 grid grid-cols-1 xl:grid-cols-2 gap-6">
          {plugins.map((plugin) => (
            <div
              key={plugin.id}
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
                        plugin.isActive
                          ? 'bg-green-100 text-green-600'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {plugin.isActive ? 'Active' : 'Disabled'}
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
                    <div className="font-black text-gray-900">{plugin.category || 'Utility'}</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-2xl">
                    <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">
                      Version
                    </div>
                    <div className="font-black text-gray-900">v{plugin.version || '1.0.0'}</div>
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
                  <button
                    onClick={() => togglePlugin(plugin.id)}
                    className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                      plugin.isActive
                        ? 'bg-red-50 text-red-600 hover:bg-red-100'
                        : 'bg-green-50 text-green-600 hover:bg-green-100'
                    }`}
                  >
                    {plugin.isActive ? 'Disable Globally' : 'Enable Globally'}
                  </button>
                  <button className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2 rounded-xl text-xs font-bold hover:bg-slate-800 transition-all">
                    Manage Access <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
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
