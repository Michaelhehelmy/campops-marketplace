import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Puzzle,
  Upload,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Info,
  CheckCircle2,
  XCircle,
  Loader2,
  Package,
  ExternalLink,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/contexts/AuthContext";

interface Plugin {
  name: string;
  manifest: {
    name: string;
    version: string;
    description: string;
    author?: string;
  };
  status: "loading" | "loaded" | "error" | "unloaded" | "disabled";
  error?: string;
}

export default function PluginsPage() {
  const { user } = useAuth();
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchPlugins = async () => {
    try {
      const response = await axios.get("/api/admin/plugins");
      setPlugins(response.data);
    } catch (err) {
      console.error("Failed to fetch plugins:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlugins();
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("plugin", file);

    setUploading(true);
    setMessage(null);

    try {
      await axios.post("/api/admin/plugins/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMessage({ type: "success", text: "Plugin uploaded successfully! Reloading..." });
      setTimeout(fetchPlugins, 2000);
    } catch (err: any) {
      setMessage({ type: "error", text: err.response?.data?.error || "Failed to upload plugin" });
    } finally {
      setUploading(false);
    }
  };

  const togglePlugin = async (name: string, currentStatus: string) => {
    const action = currentStatus === "disabled" ? "enable" : "disable";
    try {
      await axios.put(`/api/admin/plugins/${name}/${action}`);
      fetchPlugins();
    } catch (err) {
      console.error(`Failed to ${action} plugin:`, err);
    }
  };

  const deletePlugin = async (name: string) => {
    if (
      !window.confirm(
        `Are you sure you want to delete plugin "${name}"? This will remove all files.`
      )
    )
      return;

    try {
      await axios.delete(`/api/admin/plugins/${name}`);
      fetchPlugins();
    } catch (err) {
      console.error("Failed to delete plugin:", err);
    }
  };

  if (user?.role !== "admin") {
    return <div className="p-8 text-center">Unauthorized. Admin access only.</div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-charcoal tracking-tight flex items-center gap-3">
            <Puzzle className="text-acacia" />
            Plugin Management
          </h1>
          <p className="text-stone-500 font-medium">
            Extend your property's capabilities with custom plugins
          </p>
        </div>
        <div className="relative">
          <input
            type="file"
            id="plugin-upload"
            className="hidden"
            accept=".zip"
            onChange={handleUpload}
            disabled={uploading}
          />
          <label
            htmlFor="plugin-upload"
            className={`flex items-center gap-2 bg-acacia text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-acacia/20 cursor-pointer hover:bg-acacia/90 transition-all active:scale-95 ${uploading ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {uploading ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
            {uploading ? "Uploading..." : "Upload Plugin (.zip)"}
          </label>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-2xl flex items-center gap-3 font-medium ${message.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}
        >
          {message.type === "success" ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
          {message.text}
        </div>
      )}

      <Card className="border-none shadow-sm rounded-[2rem] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-50/50 border-b border-stone-100">
                <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-widest">
                  Plugin
                </th>
                <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-widest">
                  Version
                </th>
                <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-widest">
                  Status
                </th>
                <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-widest text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={4} className="px-6 py-8">
                      <div className="h-4 bg-stone-100 rounded w-1/3"></div>
                    </td>
                  </tr>
                ))
              ) : plugins.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-stone-400 font-medium">
                    <Package className="mx-auto mb-3 opacity-20" size={48} />
                    No plugins installed yet
                  </td>
                </tr>
              ) : (
                plugins.map((plugin) => (
                  <tr key={plugin.name} className="hover:bg-stone-50/50 transition-colors">
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="font-bold text-charcoal">{plugin.manifest.name}</span>
                        <span className="text-sm text-stone-500 line-clamp-1">
                          {plugin.manifest.description}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <code className="text-xs bg-stone-100 text-stone-600 px-2 py-1 rounded-md font-mono">
                        v{plugin.manifest.version}
                      </code>
                    </td>
                    <td className="px-6 py-5">
                      <StatusBadge status={plugin.status} error={plugin.error} />
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => togglePlugin(plugin.name, plugin.status)}
                          className={`p-2 rounded-xl transition-all ${plugin.status === "disabled" ? "text-stone-400 hover:bg-emerald-50 hover:text-emerald-600" : "text-acacia hover:bg-stone-100"}`}
                          title={plugin.status === "disabled" ? "Enable" : "Disable"}
                        >
                          {plugin.status === "disabled" ? (
                            <ToggleLeft size={24} />
                          ) : (
                            <ToggleRight size={24} />
                          )}
                        </button>
                        <button
                          onClick={() => deletePlugin(plugin.name)}
                          className="p-2 text-stone-400 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-all"
                          title="Delete"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-6 border-none shadow-sm rounded-3xl bg-charcoal text-stone-300">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white shrink-0">
              <Info size={20} />
            </div>
            <div className="space-y-2">
              <h4 className="font-bold text-white">How it works</h4>
              <p className="text-sm leading-relaxed">
                Plugins are extracted to the ecosystem directory and automatically loaded. Disabling
                a plugin unloads its hooks and routes but keeps the files intact. Deleting a plugin
                permanently removes its directory.
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-6 border-none shadow-sm rounded-3xl bg-acacia/5 border border-acacia/10">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-acacia/10 flex items-center justify-center text-acacia shrink-0">
              <ExternalLink size={20} />
            </div>
            <div className="space-y-2">
              <h4 className="font-bold text-acacia">Developer Guide</h4>
              <p className="text-sm text-acacia/70 leading-relaxed">
                Check our documentation on how to package your own plugins as .zip files. Ensure
                your plugin.json manifest version matches the platform's API requirements.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function StatusBadge({ status, error }: { status: string; error?: string }) {
  const styles: Record<string, string> = {
    loaded: "bg-emerald-100 text-emerald-700",
    disabled: "bg-stone-100 text-stone-500",
    error: "bg-rose-100 text-rose-700",
    loading: "bg-blue-100 text-blue-700",
    unloaded: "bg-stone-100 text-stone-500",
  };

  return (
    <div className="flex flex-col gap-1">
      <span
        className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full w-fit ${styles[status] || styles.unloaded}`}
      >
        {status}
      </span>
      {error && (
        <span
          className="text-[10px] text-rose-500 font-medium max-w-[200px] truncate"
          title={error}
        >
          {error}
        </span>
      )}
    </div>
  );
}
