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
} from 'lucide-react';

export default function MasterSettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [saved, setSaved] = useState(false);
  const [platformName, setPlatformName] = useState('SinaiCamps Marketplace');

  useEffect(() => {
    fetch('/api/public/platform-settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.platformName) setPlatformName(data.platformName);
      })
      .catch(() => {});
  }, []);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="flex gap-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
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
          icon={Smartphone}
          label="Mobile & PWA"
          active={activeTab === 'mobile'}
          onClick={() => setActiveTab('mobile')}
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
                <SettingSection title="Regional Settings">
                  <div className="grid grid-cols-2 gap-6">
                    <InputGroup label="Default Currency" value="USD ($)" />
                    <InputGroup label="Default Timezone" value="UTC (Global)" />
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
                      <div className="text-lg font-black text-purple-600">10.0%</div>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 border border-gray-100">
                      <div>
                        <div className="text-sm font-bold text-gray-900">Minimum Booking Fee</div>
                        <div className="text-xs text-gray-400">Fixed cost per transaction</div>
                      </div>
                      <div className="text-lg font-black text-purple-600">$1.50</div>
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
                    value={platformName}
                    onChange={(e) => setPlatformName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50/50 focus:bg-white focus:border-purple-200 focus:ring-4 focus:ring-purple-50 transition-all outline-none text-sm font-medium"
                  />
                </div>
                <InputGroup label="Support Email" value="support@sinaicamps.com" />
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

function InputGroup({ label, value }: any) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
        {label}
      </label>
      <input
        type="text"
        defaultValue={value}
        className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50/50 focus:bg-white focus:border-purple-200 focus:ring-4 focus:ring-purple-50 transition-all outline-none text-sm font-medium"
      />
    </div>
  );
}
