'use client';

import { useState, useEffect } from 'react';
import {
  Settings,
  Globe,
  CreditCard,
  ShieldCheck,
  Bell,
  Database,
  Smartphone,
  ChevronRight,
  Save,
  LayoutDashboard,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

export default function MasterSettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [saved, setSaved] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/master/settings')
      .then((res) => res.json())
      .then((data) => {
        setSettings(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch settings:', err);
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    try {
      const res = await fetch('/api/master/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
  };

  if (loading) return <div className="p-8">Loading settings...</div>;

  return (
    <div className="flex gap-12 ">
      {/* Settings Navigation */}
      <div className="w-64 shrink-0 space-y-2">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight mb-8">
          Marketplace Settings
        </h1>
        <SettingsNavItem
          icon={Settings}
          label="General"
          active={activeTab === 'general'}
          onClick={() => setActiveTab('general')}
        />
        <SettingsNavItem
          icon={Globe}
          label="Marketplace Identity"
          active={activeTab === 'branding'}
          onClick={() => setActiveTab('branding')}
        />
        <SettingsNavItem
          icon={LayoutDashboard}
          label="Homepage Layout"
          active={activeTab === 'homepage'}
          onClick={() => setActiveTab('homepage')}
        />
        <SettingsNavItem
          icon={CreditCard}
          label="Payment Gateways"
          active={activeTab === 'payments'}
          onClick={() => setActiveTab('payments')}
        />
        <SettingsNavItem
          icon={ShieldCheck}
          label="Security & Auth"
          active={activeTab === 'security'}
          onClick={() => setActiveTab('security')}
        />
        <SettingsNavItem
          icon={Database}
          label="Backup & Data"
          active={activeTab === 'data'}
          onClick={() => setActiveTab('data')}
        />
      </div>

      {/* Settings Content */}
      <div className="flex-1 max-w-3xl">
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/40 p-10">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h3 className="text-xl font-black text-gray-900 tracking-tight capitalize">
                {activeTab} Configuration
              </h3>
              <p className="text-sm text-gray-500">Configure global marketplace behavior.</p>
            </div>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
            >
              <Save className="h-4 w-4" /> Save Settings
            </button>
          </div>

          {saved && (
            <div className="mb-6 p-4 bg-green-50 text-green-600 rounded-2xl font-bold text-sm animate-in fade-in zoom-in-95">
              Settings saved successfully!
            </div>
          )}

          <div className="space-y-10">
            {activeTab === 'general' && (
              <>
                <SettingSection title="Platform Identity">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="platformName"
                      className="text-[10px] font-black uppercase tracking-widest text-gray-400"
                    >
                      Platform Name
                    </label>
                    <input
                      id="platformName"
                      type="text"
                      value={settings.platformName}
                      onChange={(e) => setSettings({ ...settings, platformName: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50/50 focus:bg-white focus:border-purple-200 focus:ring-4 focus:ring-purple-50 transition-all outline-none text-sm font-medium"
                    />
                  </div>
                </SettingSection>

                <SettingSection title="Regional Settings">
                  <div className="grid grid-cols-2 gap-6">
                    <InputGroup
                      label="Default Currency"
                      value={settings.currency}
                      onChange={(val: string) => setSettings({ ...settings, currency: val })}
                    />
                    <InputGroup
                      label="Default Timezone"
                      value={settings.timezone}
                      onChange={(val: string) => setSettings({ ...settings, timezone: val })}
                    />
                  </div>
                </SettingSection>

                <SettingSection title="Platform Fees">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 border border-gray-100">
                      <div>
                        <div className="text-sm font-bold text-gray-900">
                          Default Commission Rate
                        </div>
                        <div className="text-xs text-gray-400">
                          Applied to all new listings by default
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={settings.commissionRate}
                          onChange={(e) =>
                            setSettings({ ...settings, commissionRate: parseFloat(e.target.value) })
                          }
                          className="w-20 px-3 py-2 rounded-xl border border-gray-200 text-right font-black text-purple-600"
                        />
                        <span className="font-black text-purple-600">%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 border border-gray-100">
                      <div>
                        <div className="text-sm font-bold text-gray-900">Minimum Booking Fee</div>
                        <div className="text-xs text-gray-400">Fixed cost per transaction</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-purple-600">$</span>
                        <input
                          type="number"
                          value={settings.minBookingFee}
                          onChange={(e) =>
                            setSettings({ ...settings, minBookingFee: parseFloat(e.target.value) })
                          }
                          className="w-20 px-3 py-2 rounded-xl border border-gray-200 text-right font-black text-purple-600"
                        />
                      </div>
                    </div>
                  </div>
                </SettingSection>
              </>
            )}

            {activeTab === 'branding' && (
              <div className="space-y-8">
                <div className="space-y-1.5">
                  <label
                    htmlFor="platformName"
                    className="text-[10px] font-black uppercase tracking-widest text-gray-400"
                  >
                    Platform Name
                  </label>
                  <input
                    id="platformName"
                    type="text"
                    value={settings.platformName}
                    onChange={(e) => setSettings({ ...settings, platformName: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50/50 focus:bg-white focus:border-purple-200 focus:ring-4 focus:ring-purple-50 transition-all outline-none text-sm font-medium"
                  />
                </div>
                <InputGroup
                  label="Support Email"
                  value={settings.supportEmail}
                  onChange={(val: string) => setSettings({ ...settings, supportEmail: val })}
                />
                <div className="p-8 rounded-[2rem] bg-slate-900 text-white relative overflow-hidden">
                  <div className="relative z-10">
                    <h4 className="font-bold mb-2">Global Branding Cluster</h4>
                    <p className="text-xs text-slate-400 mb-6">
                      These settings are inherited by listings that haven't set their own branding.
                    </p>
                    <button className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl text-xs font-bold transition-all">
                      Configure Visuals
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'homepage' && <HomepageOrdering />}
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsNavItem({ icon: Icon, label, active, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all ${
        active
          ? 'bg-purple-50 text-purple-600 shadow-sm'
          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5" />
        <span className="text-sm font-bold">{label}</span>
      </div>
      {active && <ChevronRight className="h-4 w-4" />}
    </button>
  );
}

function SettingSection({ title, children }: any) {
  return (
    <div className="space-y-4">
      <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-50 pb-2">
        {title}
      </h4>
      {children}
    </div>
  );
}

function InputGroup({ label, value, onChange }: any) {
  return (
    <div className="space-y-1.5 w-full">
      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange && onChange(e.target.value)}
        className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50/50 focus:bg-white focus:border-purple-200 focus:ring-4 focus:ring-purple-50 transition-all outline-none text-sm font-medium"
      />
    </div>
  );
}

function HomepageOrdering() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/public/homepage-config')
      .then((res) => res.json())
      .then((data) => {
        setConfig(data);
        setLoading(false);
      });
  }, []);

  const moveSection = (index: number, direction: 'up' | 'down') => {
    if (!config) return;
    const newSections = [...config.sections];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newSections.length) return;

    const [removed] = newSections.splice(index, 1);
    newSections.splice(targetIndex, 0, removed);

    setConfig({ ...config, sections: newSections });
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/public/homepage-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        alert('Homepage layout saved!');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading layout...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400">
          Section Order
        </h4>
        <button
          onClick={saveConfig}
          disabled={saving}
          className="text-xs font-bold text-purple-600 hover:text-purple-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Apply Layout'}
        </button>
      </div>

      <div className="space-y-3">
        {config.sections.map((section: string, index: number) => (
          <div
            key={section}
            className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 border border-gray-100 group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white border border-gray-100 flex items-center justify-center font-black text-gray-400 text-xs">
                {index + 1}
              </div>
              <span className="font-bold text-gray-900 capitalize">
                {section.replace('-', ' ')}
              </span>
            </div>
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
              <button
                onClick={() => moveSection(index, 'up')}
                disabled={index === 0}
                className="p-2 rounded-lg bg-white border border-gray-100 hover:text-purple-600 disabled:opacity-30"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
              <button
                onClick={() => moveSection(index, 'down')}
                disabled={index === config.sections.length - 1}
                className="p-2 rounded-lg bg-white border border-gray-100 hover:text-purple-600 disabled:opacity-30"
              >
                <ArrowDown className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="p-6 rounded-2xl bg-purple-50 border border-purple-100 mt-8">
        <h5 className="text-xs font-bold text-purple-900 mb-2">Live Preview Note</h5>
        <p className="text-xs text-purple-600 leading-relaxed">
          The homepage order affects all users. Changes take effect immediately after saving.
        </p>
      </div>
    </div>
  );
}
