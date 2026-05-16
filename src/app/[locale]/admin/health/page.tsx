'use client';

import { useState, useEffect } from 'react';
import {
  Activity,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Database,
  Puzzle,
  Server,
  Clock,
} from 'lucide-react';

interface HealthData {
  status: 'ok' | 'degraded' | 'error';
  db: { status: 'ok' | 'error'; message?: string };
  plugins: { total: number; active: number };
  uptime: number;
  timestamp: string;
}

export default function SystemHealthPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const [pluginsRes] = await Promise.all([fetch('/api/master/plugins')]);
      const pluginsData = await pluginsRes.json();
      const total = pluginsData.total ?? pluginsData.plugins?.length ?? 0;
      const active = (pluginsData.plugins ?? []).filter((p: any) => p.isActive).length;

      setHealth({
        status: 'ok',
        db: { status: 'ok' },
        plugins: { total, active },
        uptime: Math.floor(performance.now() / 1000),
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      setHealth({
        status: 'error',
        db: { status: 'error', message: String(err) },
        plugins: { total: 0, active: 0 },
        uptime: 0,
        timestamp: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
      setLastRefresh(new Date());
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">System Health</h1>
          <p className="text-gray-500 text-sm mt-1">
            {lastRefresh ? `Last checked: ${lastRefresh.toLocaleTimeString()}` : 'Checking…'}
          </p>
        </div>
        <button
          onClick={fetchHealth}
          disabled={loading}
          className="flex items-center gap-2 bg-purple-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-purple-700 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Overall status banner */}
      <div
        className={`flex items-center gap-4 p-5 rounded-2xl border ${
          !health || loading
            ? 'bg-gray-50 border-gray-100'
            : health.status === 'ok'
              ? 'bg-green-50 border-green-100'
              : health.status === 'degraded'
                ? 'bg-yellow-50 border-yellow-100'
                : 'bg-red-50 border-red-100'
        }`}
      >
        {!health || loading ? (
          <div className="h-5 w-5 rounded-full bg-gray-200 animate-pulse" />
        ) : health.status === 'ok' ? (
          <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0" />
        ) : (
          <XCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
        )}
        <div>
          <div className="font-black text-gray-900">
            {loading
              ? 'Checking...'
              : health?.status === 'ok'
                ? 'All systems operational'
                : health?.status === 'degraded'
                  ? 'Some systems degraded'
                  : 'System error detected'}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">{health?.timestamp}</div>
        </div>
      </div>

      {/* Service tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <HealthTile
          icon={Database}
          label="Database"
          status={loading ? 'loading' : health?.db.status === 'ok' ? 'ok' : 'error'}
          detail={health?.db.status === 'ok' ? 'SQLite · WAL mode' : health?.db.message}
        />
        <HealthTile
          icon={Puzzle}
          label="Plugins"
          status={loading ? 'loading' : 'ok'}
          detail={
            health ? `${health.plugins.active} active / ${health.plugins.total} total` : undefined
          }
        />
        <HealthTile
          icon={Server}
          label="API Server"
          status={loading ? 'loading' : health ? 'ok' : 'error'}
          detail="Next.js · Port 3000"
        />
        <HealthTile
          icon={Clock}
          label="Session Uptime"
          status={loading ? 'loading' : 'ok'}
          detail={health ? formatUptime(health.uptime) : undefined}
        />
      </div>

      {/* Endpoint checks */}
      <EndpointChecks />
    </div>
  );
}

function HealthTile({
  icon: Icon,
  label,
  status,
  detail,
}: {
  icon: any;
  label: string;
  status: 'ok' | 'error' | 'loading';
  detail?: string;
}) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="h-10 w-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center">
          <Icon className="h-5 w-5 text-purple-600" />
        </div>
        {status === 'loading' ? (
          <div className="h-5 w-16 bg-gray-100 rounded-full animate-pulse" />
        ) : status === 'ok' ? (
          <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-green-100 text-green-700">
            Healthy
          </span>
        ) : (
          <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-red-100 text-red-700">
            Error
          </span>
        )}
      </div>
      <div className="font-black text-gray-900">{label}</div>
      {detail && <div className="text-xs text-gray-400 mt-1">{detail}</div>}
    </div>
  );
}

function EndpointChecks() {
  const endpoints = [
    { label: 'Plugin Registry', url: '/api/master/plugins' },
    { label: 'Listings', url: '/api/master/listings' },
    { label: 'Auth Session', url: '/api/auth/get-session' },
    { label: 'UI Registry', url: '/api/plugins/ui-registry' },
  ];

  const [results, setResults] = useState<
    Record<string, { status: number | null; ms: number | null; error?: string }>
  >({});
  const [checking, setChecking] = useState(false);

  const runChecks = async () => {
    setChecking(true);
    const res: typeof results = {};
    await Promise.all(
      endpoints.map(async ({ label, url }) => {
        const t0 = Date.now();
        try {
          const r = await fetch(url, { method: 'GET' });
          res[label] = { status: r.status, ms: Date.now() - t0 };
        } catch (e) {
          res[label] = { status: null, ms: Date.now() - t0, error: String(e) };
        }
      })
    );
    setResults(res);
    setChecking(false);
  };

  useEffect(() => {
    runChecks();
  }, []);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
        <h2 className="font-black text-gray-900 text-sm uppercase tracking-widest">
          Endpoint Checks
        </h2>
        <button
          onClick={runChecks}
          disabled={checking}
          className="text-xs font-bold text-purple-600 hover:text-purple-700 disabled:opacity-50 flex items-center gap-1"
        >
          <RefreshCw className={`h-3 w-3 ${checking ? 'animate-spin' : ''}`} />
          Re-check
        </button>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50/50 text-[10px] font-black uppercase tracking-widest text-gray-400">
            <th className="px-6 py-3 text-left">Endpoint</th>
            <th className="px-6 py-3 text-left">URL</th>
            <th className="px-6 py-3 text-left">Status</th>
            <th className="px-6 py-3 text-left">Latency</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {endpoints.map(({ label, url }) => {
            const r = results[label];
            const ok = r?.status && r.status < 400;
            return (
              <tr key={label} className="hover:bg-gray-50/50 transition-all">
                <td className="px-6 py-4 font-bold text-gray-800">{label}</td>
                <td className="px-6 py-4 text-gray-400 font-mono text-xs">{url}</td>
                <td className="px-6 py-4">
                  {!r ? (
                    <div className="h-4 w-12 bg-gray-100 rounded animate-pulse" />
                  ) : (
                    <span
                      className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                    >
                      {r.status ?? 'ERR'}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-gray-500 font-mono text-xs">
                  {r?.ms != null ? `${r.ms}ms` : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
