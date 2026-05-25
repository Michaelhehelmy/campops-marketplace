'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { PluginShell } from '@/app/PluginShell';
import { PluginRegistryProvider } from '@/components/plugins/PluginRegistryProvider';
import { Settings, User, Bell, Shield, ChevronRight, Wrench, Globe, Plus, Trash2, Eye, EyeOff } from 'lucide-react';

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const params = useParams();
  const currentTab = searchParams.get('tab') || 'general';
  const listingId = params.listingId as string;
  const locale = params.locale as string;
  const [role, setRole] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [domainQuery, setDomainQuery] = useState('');
  const [domainStatus, setDomainStatus] = useState<null | {
    available: boolean;
    domain?: string;
    message?: string;
    takenBy?: string;
  }>(null);
  const [checkingDomain, setCheckingDomain] = useState(false);
  const [savingDomain, setSavingDomain] = useState(false);

  useEffect(() => {
    fetch(`/api/listing-access?listing=${listingId}`)
      .then((r) => r.json())
      .then((d) => {
        setRole(d.role || 'staff');
        setLoading(false);
      })
      .catch(() => {
        setRole('staff');
        setLoading(false);
      });
  }, [listingId]);

  const checkDomain = async () => {
    if (!domainQuery.trim()) {
      setDomainStatus({ available: false, message: 'Enter a domain to check.' });
      return;
    }

    setCheckingDomain(true);
    try {
      const res = await fetch(
        `/api/domains/check?domain=${encodeURIComponent(domainQuery.trim())}`
      );
      const data = await res.json();
      setDomainStatus(data);
    } finally {
      setCheckingDomain(false);
    }
  };

  const saveDomain = async () => {
    if (!domainQuery.trim()) return;

    setSavingDomain(true);
    try {
      const res = await fetch(`/api/manage/${listingId}/domain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: domainQuery.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setDomainStatus({
          available: true,
          domain: data.domain,
          message: 'Domain purchased and activated for this listing.',
        });
      } else {
        setDomainStatus({
          available: false,
          message: data.error || 'Could not save domain.',
        });
      }
    } finally {
      setSavingDomain(false);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;

  if (role === 'staff') {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-black text-gray-900">Unauthorized</h1>
        <p className="mt-4 text-gray-600">Staff members do not have access to property settings.</p>
        <p className="mt-2 text-sm text-gray-400">Redirecting...</p>
      </div>
    );
  }

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'marketplace', label: 'Marketplace', icon: Settings },
    { id: 'website', label: 'Website', icon: Settings },
    { id: 'plugins', label: 'Extensions', icon: Wrench },
    { id: 'users', label: 'Team', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  return (
    <PluginRegistryProvider>
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Property Settings</h1>
          <p className="text-gray-500 font-medium">
            Manage your listing configuration and plugin extensions.
          </p>
        </div>

        <div className="flex gap-8">
          {/* Sidebar Tabs */}
          <aside className="w-64 space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon as any;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  onClick={() =>
                    router.push(`/${locale}/manage/${listingId}/settings?tab=${tab.id}`)
                  }
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                    currentTab === tab.id
                      ? 'bg-brand-600 text-white shadow-lg shadow-brand-100'
                      : 'text-gray-500 hover:bg-white hover:text-brand-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </div>
                  <ChevronRight
                    className={`h-3 w-3 ${currentTab === tab.id ? 'opacity-100' : 'opacity-0'}`}
                  />
                </button>
              );
            })}

            <div className="pt-4 pb-2 px-4">
              <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">
                Plugin Extensions
              </span>
            </div>

            {/* Plugin Injected Tabs */}
            <button
              onClick={() =>
                router.push(`/${locale}/manage/${listingId}/settings?tab=booking-admin`)
              }
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                currentTab === 'booking-admin'
                  ? 'bg-brand-600 text-white shadow-lg shadow-brand-100'
                  : 'text-gray-500 hover:bg-white hover:text-brand-600'
              }`}
            >
              Booking Management
            </button>
            <button
              onClick={() => router.push(`/${locale}/manage/${listingId}/settings?tab=crm-history`)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                currentTab === 'crm-history'
                  ? 'bg-brand-600 text-white shadow-lg shadow-brand-100'
                  : 'text-gray-500 hover:bg-white hover:text-brand-600'
              }`}
            >
              Guest History
            </button>
          </aside>

          {/* Main Content Area */}
          <div className="flex-1 bg-white rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/50 p-8 min-h-[500px]">
            {currentTab === 'general' && (
              <div className="space-y-6">
                <h2 className="text-xl font-black text-gray-900">General Settings</h2>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">
                      Property Name
                    </label>
                    <input
                      type="text"
                      className="w-full border-gray-100 rounded-xl px-4 py-3 bg-gray-50"
                      defaultValue="Acacia Luxury Camp"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">
                      Listing Status
                    </label>
                    <div className="px-4 py-3 bg-green-50 text-green-700 rounded-xl font-bold text-sm">
                      Active
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentTab === 'marketplace' && (
              <div className="space-y-8" role="tabpanel">
                <h2 className="text-xl font-black text-gray-900">Marketplace Configuration</h2>

                <div className="p-8 rounded-[2rem] bg-slate-900 text-white relative overflow-hidden">
                  <div className="relative z-10">
                    <h4 className="font-bold mb-2">Guest Experience PWA</h4>
                    <p className="text-xs text-slate-400 mb-6">
                      Enable or disable the Progressive Web App for your guests.
                    </p>
                    <button
                      className="bg-brand-600 hover:bg-brand-700 px-6 py-3 rounded-xl text-xs font-bold transition-all shadow-lg shadow-brand-900/20"
                      onClick={() => alert('PWA toggled!')}
                      role="button"
                    >
                      Toggle PWA
                    </button>
                  </div>
                </div>

                <div className="space-y-4 rounded-[2rem] border border-gray-100 bg-white p-8 shadow-sm">
                  <div>
                    <h4 className="text-lg font-black text-gray-900">Custom domain</h4>
                    <p className="text-sm text-gray-500">
                      Search availability, then attach the domain to this white-labeled listing.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 md:flex-row md:items-center">
                    <input
                      data-testid="domain-search-input"
                      value={domainQuery}
                      onChange={(e) => setDomainQuery(e.target.value)}
                      placeholder="theirown.localhost"
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
                    />
                    <button
                      type="button"
                      data-testid="domain-check-button"
                      onClick={checkDomain}
                      className="rounded-xl bg-gray-900 px-5 py-3 text-sm font-bold text-white hover:bg-gray-800"
                    >
                      {checkingDomain ? 'Checking…' : 'Check availability'}
                    </button>
                    <button
                      type="button"
                      data-testid="domain-save-button"
                      onClick={saveDomain}
                      className="rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white hover:bg-brand-700"
                    >
                      {savingDomain ? 'Saving…' : 'Save domain'}
                    </button>
                  </div>

                  {domainStatus && (
                    <div
                      data-testid="domain-status-message"
                      className={`rounded-xl px-4 py-3 text-sm font-medium ${
                        domainStatus.available
                          ? 'bg-green-50 text-green-700'
                          : 'bg-amber-50 text-amber-800'
                      }`}
                    >
                      {domainStatus.message ||
                        (domainStatus.available
                          ? `Domain ${domainStatus.domain || domainQuery} is available.`
                          : `Domain ${domainStatus.domain || domainQuery} is taken.`)}
                      {domainStatus.takenBy ? ` Taken by ${domainStatus.takenBy}.` : ''}
                    </div>
                  )}
                </div>
              </div>
            )}

            {currentTab === 'website' && <WebsiteCMS listingId={listingId} locale={locale} />}
            {currentTab === 'plugins' && <PluginManagement listingId={listingId} />}

            {/* Booking Management Tab */}
            {currentTab === 'booking-admin' && (
              <div className="space-y-6" role="tabpanel">
                <h2 className="text-xl font-black text-gray-900">Booking Management</h2>
                <p className="text-sm text-gray-500">
                  Manage reservations and booking settings for this property.
                </p>
                <div className="bg-gray-50 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100">
                    <div>
                      <div className="font-bold text-gray-900">Alice Smith</div>
                      <div className="text-xs text-gray-400">Jun 10 – Jun 15 · 2 guests</div>
                    </div>
                    <span className="text-xs font-bold px-2 py-1 rounded-full bg-green-100 text-green-700">
                      Confirmed
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100">
                    <div>
                      <div className="font-bold text-gray-900">John Guest</div>
                      <div className="text-xs text-gray-400">Jun 1 – Jun 5 · 2 guests</div>
                    </div>
                    <span className="text-xs font-bold px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                      Checked In
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* CRM History Tab */}
            {currentTab === 'crm-history' && (
              <div className="space-y-6" role="tabpanel">
                <h2 className="text-xl font-black text-gray-900">Guest Interaction History</h2>
                <p className="text-sm text-gray-500">
                  CRM activity log for all guests at this property.
                </p>
                <div className="bg-gray-50 rounded-2xl p-6 space-y-3">
                  {[
                    {
                      guest: 'Alice Smith',
                      action: 'Booking Created',
                      time: '2h ago',
                      type: 'booking',
                    },
                    {
                      guest: 'John Guest',
                      action: 'Check-in Completed',
                      time: '1d ago',
                      type: 'checkin',
                    },
                    {
                      guest: 'Alice Smith',
                      action: 'Profile Updated',
                      time: '3d ago',
                      type: 'profile',
                    },
                  ].map((entry, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100"
                    >
                      <div className="h-8 w-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-sm">
                        {entry.guest[0]}
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-gray-900 text-sm">{entry.guest}</div>
                        <div className="text-xs text-gray-400">{entry.action}</div>
                      </div>
                      <span className="text-[10px] text-gray-400">{entry.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Plugin Slot for dynamic tabs */}
            <PluginShell
              name="admin.settings.tabs"
              props={{
                propertyId: listingId,
                activeTab: currentTab,
              }}
            />

            {/* Fallback for truly unknown tabs */}
            {!tabs.find((t) => t.id === currentTab) &&
              currentTab !== 'booking-admin' &&
              currentTab !== 'crm-history' &&
              currentTab !== 'plugins' && (
                <div className="text-center py-20">
                  <div className="text-gray-300 text-6xl mb-4">⚙️</div>
                  <h3 className="text-lg font-bold text-gray-900">Plugin Interface</h3>
                  <p className="text-gray-500 max-w-xs mx-auto">
                    This setting is managed by an external plugin module.
                  </p>
                </div>
              )}
          </div>
        </div>
      </div>
    </PluginRegistryProvider>
  );
}

function PluginManagement({ listingId }: { listingId: string }) {
  const [plugins, setPlugins] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch(`/api/manage/${listingId}/plugins`)
      .then((res) => res.json())
      .then((data) => {
        setPlugins(data.plugins);
        setLoading(false);
      });
  }, [listingId]);

  const togglePlugin = async (pluginName: string, currentlyEnabled: boolean) => {
    try {
      const res = await fetch(`/api/manage/${listingId}/plugins/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pluginName, isEnabled: !currentlyEnabled }),
      });
      if (res.ok) {
        setPlugins(
          plugins.map((p) => (p.name === pluginName ? { ...p, isEnabled: !currentlyEnabled } : p))
        );
      }
    } catch (err) {
      console.error('Failed to toggle plugin:', err);
    }
  };

  if (loading) return <div>Loading plugins...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-black text-gray-900">Extensions & Plugins</h2>
      <div className="grid grid-cols-1 gap-4">
        {plugins.map((plugin) => (
          <div
            key={plugin.name}
            className="flex items-center justify-between p-6 rounded-2xl border border-gray-100 bg-gray-50/50"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-2xl shadow-sm">
                {plugin.isOfficial ? '🛡️' : '📦'}
              </div>
              <div>
                <div className="font-bold text-gray-900">{plugin.displayName}</div>
                <div className="text-xs text-gray-400">{plugin.category}</div>
              </div>
            </div>
            <button
              onClick={() => togglePlugin(plugin.name, plugin.isEnabled)}
              className={`px-6 py-2 rounded-xl font-bold text-xs transition-all ${
                plugin.isEnabled
                  ? 'bg-brand-600 text-white'
                  : 'bg-white text-gray-400 border border-gray-200 hover:border-brand-200 hover:text-brand-600'
              }`}
            >
              {plugin.isEnabled ? 'Enabled' : 'Disabled'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function WebsiteCMS({ listingId, locale }: { listingId: string; locale: string }) {
  const [pages, setPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPages = () => {
    fetch(`/api/tenant/pages?propertyId=${listingId}`)
      .then((r) => (r.ok ? r.json() : { pages: [] }))
      .then((d) => setPages(d.pages ?? []))
      .catch(() => setError('Failed to load pages'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadPages(); }, [listingId]);

  const togglePublish = async (page: any) => {
    await fetch(`/api/tenant/pages/${page.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...page, isPublished: page.is_published ? 0 : 1 }),
    });
    loadPages();
  };

  const deletePage = async (id: string) => {
    if (!confirm('Delete this page?')) return;
    await fetch(`/api/tenant/pages/${id}`, { method: 'DELETE' });
    loadPages();
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading website pages...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-gray-900">Website Pages</h2>
          <p className="text-sm text-gray-500">Manage pages for your tenant website.</p>
        </div>
        <a
          href={`/${locale}/manage/${listingId}/settings?tab=website-editor`}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 text-white text-sm font-bold hover:bg-brand-700 transition-all"
        >
          <Plus className="h-4 w-4" /> Add Page
        </a>
      </div>

      {pages.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-2xl border border-gray-100">
          <Globe className="h-12 w-12 text-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900 mb-2">No website pages yet</h3>
          <p className="text-sm text-gray-500 max-w-xs mx-auto">
            Create your first page to start building your tenant website.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {pages.map((page) => (
            <div
              key={page.id}
              className="flex items-center justify-between p-4 rounded-2xl border border-gray-100 bg-white"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`h-2 w-2 rounded-full ${page.is_published ? 'bg-green-500' : 'bg-gray-300'}`}
                />
                <div>
                  <div className="font-bold text-gray-900 text-sm">{page.title}</div>
                  <div className="text-xs text-gray-400">/{page.slug}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => togglePublish(page)}
                  className="p-2 text-gray-400 hover:text-brand-600 transition-all rounded-xl hover:bg-gray-50"
                  title={page.is_published ? 'Unpublish' : 'Publish'}
                >
                  {page.is_published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => deletePage(page.id)}
                  className="p-2 text-gray-400 hover:text-red-500 transition-all rounded-xl hover:bg-red-50"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
