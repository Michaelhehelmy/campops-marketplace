'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  Activity,
  Play,
  Database,
  ArrowRight,
  RefreshCw,
  Terminal,
  Layers,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

export default function GenericPluginAdminPage() {
  const params = useParams();
  const pathSegments = params.path as string[];
  const pluginId = pathSegments?.[0] || 'unknown';

  const [pingResult, setPingResult] = useState<any>(null);
  const [pingLoading, setPingLoading] = useState(false);

  const [rowsResult, setRowsResult] = useState<any>(null);
  const [rowsLoading, setRowsLoading] = useState(false);

  const [echoKey, setEchoKey] = useState('test_key');
  const [echoValue, setEchoValue] = useState('Hello from SinaiCamps Console');
  const [echoResult, setEchoResult] = useState<any>(null);
  const [echoLoading, setEchoLoading] = useState(false);

  // For test-dock
  const [dummyResult, setDummyResult] = useState<any>(null);
  const [dummyLoading, setDummyLoading] = useState(false);

  const handlePing = async () => {
    setPingLoading(true);
    try {
      const url =
        pluginId === 'test-dock' ? '/api/test-dock/ping' : '/api/test-probe/ping?slug=acacia';
      const res = await fetch(url);
      const data = await res.json();
      setPingResult(data);
    } catch (err: any) {
      setPingResult({ error: err.message });
    } finally {
      setPingLoading(false);
    }
  };

  const handleFetchRows = async () => {
    setRowsLoading(true);
    try {
      const url = '/api/test-probe/rows?slug=acacia';
      const res = await fetch(url);
      const data = await res.json();
      setRowsResult(data);
    } catch (err: any) {
      setRowsResult({ error: err.message });
    } finally {
      setRowsLoading(false);
    }
  };

  const handleSendEcho = async () => {
    setEchoLoading(true);
    try {
      const url = '/api/test-probe/echo?slug=acacia';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [echoKey]: echoValue }),
      });
      const data = await res.json();
      setEchoResult(data);
      handleFetchRows(); // Refresh logs/rows
    } catch (err: any) {
      setEchoResult({ error: err.message });
    } finally {
      setEchoLoading(false);
    }
  };

  const handleFetchDummy = async () => {
    setDummyLoading(true);
    try {
      const res = await fetch('/api/test-dock/dummy');
      const data = await res.json();
      setDummyResult(data);
    } catch (err: any) {
      setDummyResult({ error: err.message });
    } finally {
      setDummyLoading(false);
    }
  };

  useEffect(() => {
    handlePing();
    if (pluginId === 'test-probe') {
      handleFetchRows();
    } else if (pluginId === 'test-dock') {
      handleFetchDummy();
    }
  }, [pluginId]);

  if (pluginId === 'test-probe') {
    return (
      <div className="space-y-8 animate-in fade-in duration-300">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Activity className="h-6 w-6 text-purple-600 animate-pulse" />
            Test Probe Dashboard
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Sandbox console for testing multi-tenant isolation, hook execution, and database schema
            migrations.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Diagnostic Controls */}
          <div className="space-y-8">
            {/* Ping Endpoint */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-black text-gray-900 text-sm uppercase tracking-widest flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-purple-500" />
                  Plugin Ping (GET /api/test-probe/ping)
                </h2>
                <button
                  onClick={handlePing}
                  disabled={pingLoading}
                  className="p-2 rounded-xl text-gray-400 hover:text-purple-600 hover:bg-gray-50 transition-all disabled:opacity-50"
                  title="Run Ping"
                >
                  <RefreshCw className={`h-4 w-4 ${pingLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <div className="bg-slate-950 rounded-xl p-4 font-mono text-xs text-purple-400 overflow-x-auto max-h-40">
                {pingResult ? (
                  <pre>{JSON.stringify(pingResult, null, 2)}</pre>
                ) : (
                  <span className="text-slate-500">No output. Press refresh to execute.</span>
                )}
              </div>
            </div>

            {/* Echo Endpoint */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
              <h2 className="font-black text-gray-900 text-sm uppercase tracking-widest flex items-center gap-2">
                <Play className="h-4 w-4 text-purple-500" />
                Echo Test & Hook (POST /api/test-probe/echo)
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">
                    JSON Key
                  </label>
                  <input
                    type="text"
                    value={echoKey}
                    onChange={(e) => setEchoKey(e.target.value)}
                    className="w-full text-sm font-semibold text-gray-900 px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-purple-600"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">
                    JSON Value
                  </label>
                  <input
                    type="text"
                    value={echoValue}
                    onChange={(e) => setEchoValue(e.target.value)}
                    className="w-full text-sm font-semibold text-gray-900 px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-purple-600"
                  />
                </div>
              </div>

              <button
                onClick={handleSendEcho}
                disabled={echoLoading}
                className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm py-3 px-4 rounded-xl transition-all shadow-md shadow-purple-200 disabled:opacity-50"
              >
                {echoLoading ? 'Executing...' : 'Trigger Echo & Hook'}
                <ArrowRight className="h-4 w-4" />
              </button>

              {echoResult && (
                <div className="bg-slate-950 rounded-xl p-4 font-mono text-xs text-green-400 overflow-x-auto max-h-40">
                  <pre>{JSON.stringify(echoResult, null, 2)}</pre>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Scoped Database Rows */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4 flex flex-col h-full">
            <div className="flex items-center justify-between">
              <h2 className="font-black text-gray-900 text-sm uppercase tracking-widest flex items-center gap-2">
                <Database className="h-4 w-4 text-purple-500" />
                Scoped Data Rows (plugin_test_probe_probes)
              </h2>
              <button
                onClick={handleFetchRows}
                disabled={rowsLoading}
                className="p-2 rounded-xl text-gray-400 hover:text-purple-600 hover:bg-gray-50 transition-all disabled:opacity-50"
                title="Refresh Rows"
              >
                <RefreshCw className={`h-4 w-4 ${rowsLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 min-h-[300px]">
              {rowsLoading && !rowsResult ? (
                <div className="flex items-center justify-center h-48">
                  <RefreshCw className="h-6 w-6 animate-spin text-purple-600" />
                </div>
              ) : rowsResult?.rows && rowsResult.rows.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {rowsResult.rows.map((row: any) => {
                    let parsedVal: any = {};
                    try {
                      parsedVal = JSON.parse(row.value);
                    } catch {}
                    const isIsolatedOk = parsedVal._tenant === 'acacia';

                    return (
                      <div key={row.id} className="py-3 flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-gray-900">ID: {row.id}</span>
                            <span className="text-[9px] font-mono text-gray-400">
                              Key: {row.key}
                            </span>
                          </div>
                          <pre className="text-[11px] text-gray-600 font-mono bg-gray-50 p-2 rounded-lg max-w-md overflow-x-auto">
                            {JSON.stringify(parsedVal, null, 2)}
                          </pre>
                        </div>
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          {isIsolatedOk ? (
                            <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-green-700 bg-green-50 px-2 py-0.5 rounded-md">
                              <CheckCircle2 className="h-3 w-3 text-green-600" />
                              Isolated (Acacia)
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-red-700 bg-red-50 px-2 py-0.5 rounded-md">
                              <XCircle className="h-3 w-3 text-red-600" />
                              Leak Risk
                            </span>
                          )}
                          <span className="text-[9px] text-gray-400">{row.created_at || '—'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-20 text-gray-400 text-sm">
                  No rows found. Use the Echo form to populate the database.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (pluginId === 'test-dock') {
    return (
      <div className="space-y-8 animate-in fade-in duration-300">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Layers className="h-6 w-6 text-purple-600" />
            Test Dock Dashboard
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Sandbox workspace for testing dynamic UI slots registration and payment hooks
            integration.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Diagnostics */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-black text-gray-900 text-sm uppercase tracking-widest flex items-center gap-2">
                <Terminal className="h-4 w-4 text-purple-500" />
                Plugin Ping (GET /api/test-dock/ping)
              </h2>
              <button
                onClick={handlePing}
                disabled={pingLoading}
                className="p-2 rounded-xl text-gray-400 hover:text-purple-600 hover:bg-gray-50 transition-all disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${pingLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="bg-slate-950 rounded-xl p-4 font-mono text-xs text-purple-400 overflow-x-auto max-h-40">
              {pingResult ? (
                <pre>{JSON.stringify(pingResult, null, 2)}</pre>
              ) : (
                <span className="text-slate-500">No output. Press refresh to execute.</span>
              )}
            </div>
          </div>

          {/* Right Column - Dummy Table Scoped Rows */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-black text-gray-900 text-sm uppercase tracking-widest flex items-center gap-2">
                <Database className="h-4 w-4 text-purple-500" />
                Dummy Scoped Rows (plugin_test_dock_dummy)
              </h2>
              <button
                onClick={handleFetchDummy}
                disabled={dummyLoading}
                className="p-2 rounded-xl text-gray-400 hover:text-purple-600 hover:bg-gray-50 transition-all disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${dummyLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="overflow-y-auto space-y-3 min-h-[200px]">
              {dummyLoading && !dummyResult ? (
                <div className="flex items-center justify-center h-32">
                  <RefreshCw className="h-6 w-6 animate-spin text-purple-600" />
                </div>
              ) : dummyResult?.data && dummyResult.data.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {dummyResult.data.map((row: any) => (
                    <div key={row.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-gray-900">{row.name}</div>
                        <div className="text-gray-500 font-mono mt-0.5">{row.value}</div>
                      </div>
                      <div className="text-right text-[10px] text-gray-400">
                        <div>ID: {row.id}</div>
                        <div>{row.created_at || '—'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 text-gray-400 text-sm">
                  No dummy rows found in `plugin_test_dock_dummy`.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
      <h2 className="text-xl font-bold text-gray-900">Plugin Portal: {pluginId}</h2>
      <p className="text-gray-500 mt-2 text-sm">
        This plugin does not expose a custom admin console interface.
      </p>
    </div>
  );
}
