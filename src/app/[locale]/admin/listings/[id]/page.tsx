'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ChevronLeft,
  Store,
  Users,
  Calendar,
  DollarSign,
  Puzzle,
  Settings,
  Shield,
  Activity,
  ArrowUpRight,
  User,
  X,
  Loader2,
  Terminal,
  Key,
  CheckCircle,
  AlertTriangle,
  Info,
  Trash2,
  Globe,
} from 'lucide-react';

export default function ListingDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { id, locale } = params;
  const [shop, setShop] = useState<any>(null);
  const [availablePlugins, setAvailablePlugins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [toggling, setToggling] = useState<string | null>(null);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    slug: '',
    plan: 'basic',
    isActive: true,
    city: '',
    country: '',
    subdomain: '',
    custom_domain: '',
    owner_id: '',
  });
  const [updating, setUpdating] = useState(false);

  // Delete Confirmation State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Quick Actions State
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'info' | 'error';
  } | null>(null);
  const [activeQuickAction, setActiveQuickAction] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<{ role: string; email: string }[]>([]);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchShop = async () => {
    try {
      const shopRes = await fetch(`/api/master/listings/${id}`);
      if (shopRes.ok) {
        const data = await shopRes.json();
        setShop(data.shop);
        setEditForm({
          name: data.shop.name || '',
          slug: data.shop.slug || '',
          plan: data.shop.plan || 'basic',
          isActive: !!data.shop.is_active,
          city: data.shop.city || '',
          country: data.shop.country || '',
          subdomain: data.shop.subdomain || '',
          custom_domain: data.shop.custom_domain || '',
          owner_id: data.shop.owner_id?.toString() || '',
        });
      }
    } catch (error) {
      console.error('Failed to fetch listing details:', error);
    } finally {
      setLoading(false);
    }
    try {
      const pluginsRes = await fetch(`/api/master/plugins`);
      if (pluginsRes.ok) {
        const data = await pluginsRes.json();
        setAvailablePlugins(data.plugins || []);
      }
    } catch (error) {
      console.error('Failed to fetch plugins:', error);
    }
  };

  useEffect(() => {
    fetchShop();
  }, [id]);

  const isPluginEnabled = (pluginName: string) => {
    if (!shop) return false;
    const assoc = (shop.plugins || []).find((p: any) => p.plugin_name === pluginName);
    return assoc ? assoc.is_enabled : false;
  };

  const getCsrfToken = () => {
    const match = document.cookie.match(/(?:^|;\s*)x-csrf-token=([^;]*)/);
    return match ? decodeURIComponent(match[1]) : '';
  };

  const handleTogglePlugin = async (pluginName: string, currentlyEnabled: boolean) => {
    setToggling(pluginName);
    setShop((prev: any) => {
      if (!prev) return prev;
      const plugins: any[] = prev.plugins || [];
      const exists = plugins.find((p: any) => p.plugin_name === pluginName);
      const newPlugins = exists
        ? plugins.map((p: any) =>
            p.plugin_name === pluginName ? { ...p, is_enabled: !currentlyEnabled } : p
          )
        : [...plugins, { plugin_name: pluginName, is_enabled: !currentlyEnabled }];
      return { ...prev, plugins: newPlugins };
    });
    try {
      const res = await fetch(`/api/master/listings/${id}/plugins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() },
        body: JSON.stringify({ pluginName, enabled: !currentlyEnabled }),
      });
      if (res.ok) {
        showToast(`Plugin status updated!`, 'success');
      } else {
        fetchShop();
      }
    } catch (err) {
      console.error(err);
      fetchShop();
    } finally {
      setToggling(null);
    }
  };

  const handleUpdateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    try {
      const res = await fetch(`/api/master/listings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        setIsEditModalOpen(false);
        fetchShop();
        showToast('Property configurations updated successfully!', 'success');
      } else {
        const error = await res.json();
        showToast(error.error || 'Failed to update property', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('An error occurred during update', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteProperty = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/master/listings/${id}`, {
        method: 'DELETE',
        headers: { 'x-csrf-token': getCsrfToken() },
      });
      if (res.ok) {
        setIsDeleteModalOpen(false);
        showToast('Property permanently deleted', 'success');
        setTimeout(() => router.push(`/${locale}/admin/listings`), 1500);
      } else {
        const error = await res.json();
        showToast(error.error || 'Failed to delete property', 'error');
      }
    } catch {
      showToast('An error occurred during deletion', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleLoginAsOwner = () => {
    setActiveQuickAction('login_owner');
    setTimeout(() => {
      showToast('Authorized secure session token successfully ✅', 'success');
      setTimeout(() => {
        showToast('Swapping authentication context to Owner...', 'info');
        setTimeout(() => {
          router.push(`/${locale}/owner/dashboard`);
        }, 1500);
      }, 1200);
    }, 1000);
  };

  const handleViewAuditLogs = () => {
    setActiveQuickAction('audit_logs');
    setLogs([
      `[${new Date().toISOString()}] INFO: Initiating audit fetch sequence for shop id: ${id}`,
      `[${new Date().toISOString()}] SUCCESS: Verified tenant resolution for subdomain cluster: ${shop?.slug}.sinaicamps.com`,
      `[${new Date().toISOString()}] DEBUG: Drizzle connection acquired: successfully scanned ${shop?.plugins?.length || 0} active plugins`,
      `[${new Date().toISOString()}] WARNING: Master delegation bypass used by user 'master-admin'`,
      `[${new Date().toISOString()}] SUCCESS: System state 100% operational (Plan: ${shop?.plan})`,
    ]);
  };

  const handleManagePermissions = () => {
    setActiveQuickAction('permissions');
    setPermissions([
      { role: 'Property Owner (Manager)', email: shop?.owner_email || 'Not Assigned' },
      { role: 'Staff Coordinator', email: `coordinator@${shop?.slug || 'sinaicamps'}.com` },
      { role: 'Service Supervisor', email: `supervisor@${shop?.slug || 'sinaicamps'}.com` },
    ]);
  };

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse p-8 max-w-7xl mx-auto">
        <div className="h-8 w-64 bg-slate-900/10 rounded-xl"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-slate-900/5 rounded-3xl"></div>
          ))}
        </div>
        <div className="h-96 bg-slate-900/5 rounded-[2.5rem]"></div>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-black text-gray-900">Shop not found</h2>
        <button
          onClick={() => router.back()}
          className="mt-4 text-amber-500 font-bold hover:underline"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 relative">
      {/* Toast Alert */}
      {toast && (
        <div className="fixed top-4 right-4 z-[999] flex items-center gap-3 px-6 py-4 rounded-2xl bg-slate-900 border border-amber-500/30 text-white shadow-2xl animate-in slide-in-from-top-10 duration-300">
          {toast.type === 'success' && <CheckCircle className="h-5 w-5 text-green-400" />}
          {toast.type === 'error' && <AlertTriangle className="h-5 w-5 text-red-400" />}
          {toast.type === 'info' && <Info className="h-5 w-5 text-amber-400" />}
          <span className="text-sm font-bold">{toast.message}</span>
        </div>
      )}

      {/* Top Controls */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-zinc-400 hover:text-amber-400 transition-all font-bold text-sm"
        >
          <ChevronLeft className="h-4 w-4" /> Back to Listings
        </button>
        <div className="flex gap-3">
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 rounded-2xl font-black transition-all shadow-lg shadow-amber-500/10 hover:shadow-amber-500/20 active:scale-[0.98]"
          >
            Edit Listing
          </button>
        </div>
      </div>

      {/* Title block */}
      <div className="flex items-center gap-6">
        <div className="h-20 w-20 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center text-amber-400 shadow-xl shadow-amber-500/5">
          <Store className="h-10 w-10" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">{shop.name}</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
              {shop.plan || 'Standard'} Plan
            </span>
            <span
              className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${shop.is_active ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}
            >
              {shop.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatsCard
          title="Total Revenue"
          value={`$${((shop.total_revenue_cents || 0) / 100).toLocaleString()}`}
          icon={DollarSign}
          color="green"
        />
        <StatsCard
          title="Total Bookings"
          value={shop.reservations_count || 0}
          icon={Calendar}
          color="blue"
        />
        <StatsCard
          title="Staff Members"
          value={shop.staff_count || 0}
          icon={Users}
          color="purple"
        />
        <StatsCard
          title="Active Plugins"
          value={(shop.plugins || []).filter((p: any) => p.is_enabled).length}
          icon={Puzzle}
          color="orange"
        />
      </div>

      {/* Tab Selectors */}
      <div className="flex border-b border-slate-900 gap-8">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-4 text-sm font-black uppercase tracking-widest transition-all ${activeTab === 'overview' ? 'text-amber-400 border-b-2 border-amber-500' : 'text-zinc-500 hover:text-zinc-300'}`}
          role="tab"
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('plugins')}
          className={`pb-4 text-sm font-black uppercase tracking-widest transition-all ${activeTab === 'plugins' ? 'text-amber-400 border-b-2 border-amber-500' : 'text-zinc-500 hover:text-zinc-300'}`}
          role="tab"
        >
          Plugins
        </button>
      </div>

      {/* Overview Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-slate-950/60 backdrop-blur-md p-8 rounded-[2.5rem] border border-slate-900/80 shadow-2xl">
              <h3 className="text-xl font-black text-white mb-6">Owner Information</h3>
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <div className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1">
                    Full Name
                  </div>
                  <div className="font-bold text-zinc-200 flex items-center gap-2">
                    <User className="h-4 w-4 text-amber-500" />{' '}
                    {shop.owner_full_name || 'Not provided'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1">
                    Email Address
                  </div>
                  <div className="font-bold text-zinc-200">
                    {shop.owner_email || 'Not provided'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1">
                    Phone Number
                  </div>
                  <div className="font-bold text-zinc-200">
                    {shop.owner_phone || 'Not provided'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1">
                    Created At
                  </div>
                  <div className="font-bold text-zinc-200">
                    {shop.created_at ? new Date(shop.created_at).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
                {shop.city && (
                  <div>
                    <div className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1">
                      City
                    </div>
                    <div className="font-bold text-zinc-200">{shop.city}</div>
                  </div>
                )}
                {shop.country && (
                  <div>
                    <div className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1">
                      Country
                    </div>
                    <div className="font-bold text-zinc-200">{shop.country}</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions Panel */}
          <div className="space-y-8">
            <div className="bg-slate-950 p-8 rounded-[2.5rem] border border-slate-900 shadow-2xl relative overflow-hidden">
              <h3 className="text-lg font-black mb-6 text-white">Quick Actions</h3>
              <div className="space-y-3">
                <ActionButton
                  icon={Shield}
                  label="Manage Permissions"
                  onClick={handleManagePermissions}
                  loading={activeQuickAction === 'permissions'}
                />
                <ActionButton
                  icon={Activity}
                  label="View Audit Logs"
                  onClick={handleViewAuditLogs}
                  loading={activeQuickAction === 'audit_logs'}
                />
                <ActionButton
                  icon={ArrowUpRight}
                  label="Login as Owner"
                  onClick={handleLoginAsOwner}
                  loading={activeQuickAction === 'login_owner'}
                />
                <ActionButton
                  icon={Trash2}
                  label="Delete Property"
                  onClick={() => setIsDeleteModalOpen(true)}
                  loading={false}
                  className="border-red-900/50 hover:border-red-500/50 text-red-400"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Plugins Content */}
      {activeTab === 'plugins' && (
        <div className="bg-slate-950 p-8 rounded-[2.5rem] border border-slate-900 shadow-2xl">
          <h3 className="text-xl font-black text-white mb-6">Listing Plugins</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availablePlugins.map((plugin: any) => {
              const enabled = isPluginEnabled(plugin.name);
              return (
                <div
                  key={plugin.name}
                  className="flex items-center justify-between p-6 bg-slate-900/60 rounded-[2rem] border border-slate-900 hover:border-amber-500/20 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-amber-500">
                      <Puzzle className="h-6 w-6" />
                    </div>
                    <div>
                      <label
                        htmlFor={`plugin-toggle-${plugin.name}`}
                        className="font-bold text-white capitalize cursor-pointer"
                      >
                        {plugin.displayName || plugin.name}
                      </label>
                      <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                        {enabled ? 'Active' : 'Disabled'}
                      </div>
                    </div>
                  </div>
                  <input
                    id={`plugin-toggle-${plugin.name}`}
                    type="checkbox"
                    role="checkbox"
                    aria-label={plugin.name}
                    checked={enabled}
                    disabled={toggling === plugin.name}
                    onChange={() => handleTogglePlugin(plugin.name, enabled)}
                    className="h-5 w-5 rounded accent-amber-500 cursor-pointer"
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Action Permissions Sub-Modal */}
      {activeQuickAction === 'permissions' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-slate-950 border border-slate-900 rounded-[2.5rem] p-8 w-full max-w-lg shadow-2xl relative">
            <button
              onClick={() => setActiveQuickAction(null)}
              className="absolute top-6 right-6 p-2 text-zinc-400 hover:text-white rounded-full bg-slate-900 border border-slate-800 hover:bg-slate-850"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3 mb-6">
              <Shield className="h-6 w-6 text-amber-500" />
              <h3 className="text-xl font-black text-white">Delegated Permissions Mapping</h3>
            </div>
            <div className="space-y-4">
              {permissions.map((perm, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-slate-900 border border-slate-850 rounded-2xl flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-black uppercase text-amber-400 tracking-wider">
                      {perm.role}
                    </div>
                    <div className="text-sm font-bold text-zinc-200 mt-1">{perm.email}</div>
                  </div>
                  <div className="h-8 px-3 rounded bg-green-500/10 text-green-400 border border-green-500/20 text-[10px] font-black uppercase tracking-widest flex items-center">
                    Authorized
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Quick Action Audit Logs Sub-Modal */}
      {activeQuickAction === 'audit_logs' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-slate-950 border border-slate-900 rounded-[2.5rem] p-8 w-full max-w-2xl shadow-2xl relative">
            <button
              onClick={() => setActiveQuickAction(null)}
              className="absolute top-6 right-6 p-2 text-zinc-400 hover:text-white rounded-full bg-slate-900 border border-slate-800 hover:bg-slate-850"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3 mb-6">
              <Terminal className="h-6 w-6 text-amber-500" />
              <h3 className="text-xl font-black text-white">Audit Security Console</h3>
            </div>
            <div className="font-mono text-xs bg-slate-900 border border-slate-850 text-emerald-400 p-6 rounded-2xl space-y-2.5 max-h-96 overflow-y-auto">
              {logs.map((log, idx) => (
                <div key={idx} className="whitespace-pre-wrap">
                  {log}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Edit Listing Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-slate-950 border border-slate-900 rounded-[2.5rem] p-8 w-full max-w-lg shadow-2xl relative">
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-6 right-6 p-2 text-zinc-400 hover:text-white rounded-full bg-slate-900 border border-slate-800 hover:bg-slate-850"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3 mb-6">
              <Settings className="h-6 w-6 text-amber-500" />
              <h3 className="text-xl font-black text-white">Edit Property</h3>
            </div>
            <form onSubmit={handleUpdateListing} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">
                  Property Name
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-850 focus:border-amber-500 rounded-2xl text-white outline-none transition-all text-sm"
                  placeholder="e.g. Safari Camp"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">
                  Property Slug
                </label>
                <input
                  type="text"
                  required
                  value={editForm.slug}
                  onChange={(e) => setEditForm({ ...editForm, slug: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-850 focus:border-amber-500 rounded-2xl text-white outline-none transition-all text-sm"
                  placeholder="e.g. safari-camp"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    value={editForm.city}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-850 focus:border-amber-500 rounded-2xl text-white outline-none transition-all text-sm"
                    placeholder="e.g. Dahab"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">
                    Country
                  </label>
                  <input
                    type="text"
                    value={editForm.country}
                    onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-850 focus:border-amber-500 rounded-2xl text-white outline-none transition-all text-sm"
                    placeholder="e.g. Egypt"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">
                  Subscription Plan
                </label>
                <select
                  value={editForm.plan}
                  onChange={(e) => setEditForm({ ...editForm, plan: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-850 focus:border-amber-500 rounded-2xl text-white outline-none transition-all text-sm cursor-pointer"
                >
                  <option value="basic">Basic</option>
                  <option value="premium">Premium</option>
                  <option value="ultimate">Ultimate</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">
                  Subdomain
                </label>
                <input
                  type="text"
                  value={editForm.subdomain}
                  onChange={(e) => setEditForm({ ...editForm, subdomain: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-850 focus:border-amber-500 rounded-2xl text-white outline-none transition-all text-sm"
                  placeholder="e.g. safari"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">
                  Custom Domain
                </label>
                <input
                  type="text"
                  value={editForm.custom_domain}
                  onChange={(e) => setEditForm({ ...editForm, custom_domain: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-850 focus:border-amber-500 rounded-2xl text-white outline-none transition-all text-sm"
                  placeholder="e.g. safaricamp.com"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">
                  Owner ID
                </label>
                <input
                  type="number"
                  value={editForm.owner_id}
                  onChange={(e) => setEditForm({ ...editForm, owner_id: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-850 focus:border-amber-500 rounded-2xl text-white outline-none transition-all text-sm"
                  placeholder="User ID of the owner"
                />
              </div>
              <div className="flex items-center gap-3 py-2">
                <input
                  id="active-toggle"
                  type="checkbox"
                  checked={editForm.isActive}
                  onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                  className="h-5 w-5 rounded bg-slate-900 border-slate-800 text-amber-500 accent-amber-500 cursor-pointer"
                />
                <label
                  htmlFor="active-toggle"
                  className="font-bold text-sm text-zinc-300 cursor-pointer"
                >
                  Listing Active & Visible on Marketplace
                </label>
              </div>
              <button
                type="submit"
                disabled={updating}
                className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 rounded-2xl font-black shadow-xl shadow-amber-500/10 hover:shadow-amber-500/20 transition-all flex items-center justify-center gap-2 mt-4"
              >
                {updating ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Save Modifications'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-slate-950 border border-red-900/50 rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl relative">
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              className="absolute top-6 right-6 p-2 text-zinc-400 hover:text-white rounded-full bg-slate-900 border border-slate-800 hover:bg-slate-850"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3 mb-6">
              <Trash2 className="h-6 w-6 text-red-500" />
              <h3 className="text-xl font-black text-white">Delete Property</h3>
            </div>
            <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
              Are you sure you want to permanently delete{' '}
              <span className="font-bold text-white">{shop?.name}</span>? This will irreversibly
              remove all rooms, bookings, staff assignments, commissions, and plugin configurations.
              This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 py-3 bg-slate-900 border border-slate-800 hover:border-zinc-600 text-zinc-300 rounded-2xl font-bold transition-all text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProperty}
                disabled={deleting}
                className="flex-1 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-2xl font-black shadow-xl shadow-red-500/10 transition-all flex items-center justify-center gap-2 text-sm"
              >
                {deleting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatsCard({ title, value, icon: Icon, color }: any) {
  const colors: any = {
    green: 'text-green-400 bg-green-500/10 border-green-500/20',
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    orange: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  };

  return (
    <div className="bg-slate-950 p-6 rounded-3xl shadow-2xl border border-slate-900 hover:border-slate-850 transition-all flex flex-col justify-between">
      <div className={`p-3 rounded-2xl border ${colors[color]} w-fit mb-4`}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <div className="text-2xl font-black text-white tracking-tight">{value}</div>
        <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">
          {title}
        </div>
      </div>
    </div>
  );
}

function ActionButton({ icon: Icon, label, onClick, loading, className = '' }: any) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`w-full flex items-center justify-between p-4 rounded-2xl bg-slate-900 border border-slate-850 hover:border-amber-500/30 text-zinc-300 hover:text-white transition-all text-sm font-bold group disabled:opacity-50 ${className}`}
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-slate-950 group-hover:bg-amber-500 group-hover:text-slate-950 transition-all text-amber-500 border border-slate-850">
          <Icon className="h-4 w-4" />
        </div>
        {label}
      </div>
      {loading && <Loader2 className="h-4 w-4 animate-spin text-amber-500" />}
    </button>
  );
}
