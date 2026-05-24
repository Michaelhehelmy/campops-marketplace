'use client';

import { useEffect, useState } from 'react';
import {
  Save, Loader2, ArrowUpCircle, CheckCircle, XCircle, Palette, Globe,
  Settings2, Image, Type, Phone, Mail, MapPin,
} from 'lucide-react';

interface PropertyForm {
  name: string;
  description: string;
  city: string;
  country: string;
  currency_code: string;
  type: string;
}

interface Branding {
  logo?: string;
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  tagline?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  socialLinks?: string;
  heroImage?: string;
}

interface PropertyData {
  id: string;
  name: string;
  slug: string;
  plan: string;
  subdomain: string | null;
  customDomain: string | null;
  domainVerified: boolean;
  branding: Branding | null;
  settings: Record<string, unknown> | null;
  description?: string;
  city?: string;
  country?: string;
  currency_code?: string;
  type?: string;
}

const CURRENCIES = ['USD', 'EUR', 'GBP', 'AED', 'EGP', 'SAR', 'ZAR'];
const PROPERTY_TYPES = ['camp', 'hotel', 'glamping', 'lodge', 'resort', 'villa'];

export default function OwnerPropertyPage() {
  const [data, setData] = useState<PropertyData | null>(null);
  const [form, setForm] = useState<PropertyForm>({
    name: '', description: '', city: '', country: '', currency_code: 'USD', type: 'camp',
  });
  const [branding, setBranding] = useState<Branding>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Upgrade state
  const [upgradeSubdomain, setUpgradeSubdomain] = useState('');
  const [upgradeCustomDomain, setUpgradeCustomDomain] = useState('');
  const [upgrading, setUpgrading] = useState(false);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);
  const [upgradeSuccess, setUpgradeSuccess] = useState<string | null>(null);

  // Domain check
  const [domainCheck, setDomainCheck] = useState<string>('');
  const [domainCheckResult, setDomainCheckResult] = useState<{ available: boolean; reason?: string } | null>(null);
  const [domainChecking, setDomainChecking] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/owner/me');
        if (res.ok) {
          const d = await res.json();
          const p = d.property as PropertyData;
          setData(p);
          setForm({
            name: p.name ?? '',
            description: (p as any).description ?? '',
            city: (p as any).city ?? '',
            country: (p as any).country ?? '',
            currency_code: (p as any).currency_code ?? 'USD',
            type: (p as any).type ?? 'camp',
          });
          if (p.branding) setBranding(p.branding);
        }
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;
    setError(null);
    setSaving(true);
    try {
      const body: Record<string, unknown> = { ...form, ...branding };
      const res = await fetch(`/api/properties/${data.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await res.json();
      if (!res.ok) { setError(result.error ?? 'Failed to save.'); }
      else { setSaved(true); setTimeout(() => setSaved(false), 3000); }
    } catch { setError('Network error.'); }
    finally { setSaving(false); }
  };

  const doUpgrade = async (newPlan: string) => {
    if (!data) return;
    setUpgrading(true);
    setUpgradeError(null);
    setUpgradeSuccess(null);
    try {
      const body: Record<string, unknown> = { siteId: data.id, newPlan };
      if (newPlan === 'premium') body.subdomain = upgradeSubdomain.trim();
      if (newPlan === 'ultimate') {
        if (upgradeCustomDomain.trim()) body.customDomain = upgradeCustomDomain.trim();
      }
      const res = await fetch('/api/owner/upgrade', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const result = await res.json();
      if (!res.ok) { setUpgradeError(result.error); }
      else {
        setData({ ...data, plan: newPlan, subdomain: result.subdomain ?? data.subdomain, customDomain: result.customDomain ?? data.customDomain });
        setUpgradeSuccess(newPlan === 'premium' ? 'Upgraded to Premium! Subdomain is ready.' : 'Upgraded to Ultimate! Point your CNAME to sinaicamps.com.');
      }
    } catch { setUpgradeError('Upgrade failed.'); }
    finally { setUpgrading(false); }
  };

  const checkDomain = async () => {
    if (!domainCheck.trim()) return;
    setDomainChecking(true);
    setDomainCheckResult(null);
    try {
      const res = await fetch(`/api/owner/domains/check?domain=${encodeURIComponent(domainCheck.trim())}`);
      const result = await res.json();
      setDomainCheckResult(result);
    } catch { setDomainCheckResult({ available: false, reason: 'Check failed.' }); }
    finally { setDomainChecking(false); }
  };

  const updateBranding = (key: keyof Branding, value: string) => {
    setBranding((prev) => ({ ...prev, [key]: value || undefined }));
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const planBadge = (plan: string) => {
    const styles: Record<string, string> = {
      ultimate: 'bg-purple-100 text-purple-800',
      premium: 'bg-amber-100 text-amber-800',
      basic: 'bg-slate-100 text-slate-700',
    };
    return (
      <span className={`text-xs font-semibold px-3 py-1 rounded-full capitalize ${styles[plan] ?? 'bg-slate-100 text-slate-700'}`}>
        {plan} plan
      </span>
    );
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Property</h1>
          <p className="text-gray-500 mt-0.5">Manage your listing, branding, and plan.</p>
        </div>
        {data && planBadge(data.plan)}
      </div>

      {/* Upgrade Panel */}
      {data && data.plan !== 'ultimate' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <ArrowUpCircle className="w-5 h-5 text-indigo-600" />
            Upgrade your plan
          </h2>
          {upgradeError && (
            <div className="flex items-center gap-2 text-red-700 bg-red-50 rounded-lg px-4 py-3 text-sm mb-4">
              <XCircle className="w-4 h-4 shrink-0" /> {upgradeError}
            </div>
          )}
          {upgradeSuccess && (
            <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-lg px-4 py-3 text-sm mb-4">
              <CheckCircle className="w-4 h-4 shrink-0" /> {upgradeSuccess}
            </div>
          )}
          <div className="grid sm:grid-cols-2 gap-4">
            {data.plan === 'basic' && (
              <div className="rounded-xl border border-amber-200 p-4">
                <p className="font-medium text-gray-900 mb-1">
                  Operations Suite <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full ml-1">Premium</span>
                </p>
                <p className="text-sm text-gray-500 mb-3">$49/mo — full ops panel, plugins & your own subdomain.</p>
                {data.subdomain && (
                  <p className="text-xs text-amber-700 bg-amber-50 rounded px-3 py-2 mb-3">
                    Your subdomain: <strong>{data.subdomain}.sinaicamps.com</strong>
                  </p>
                )}
                <input
                  type="text"
                  placeholder="your-camp (will become your-camp.sinaicamps.com)"
                  value={upgradeSubdomain}
                  onChange={(e) => setUpgradeSubdomain(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <button
                  disabled={upgrading || !upgradeSubdomain.trim()}
                  onClick={() => doUpgrade('premium')}
                  className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg flex items-center justify-center gap-2"
                >
                  {upgrading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUpCircle className="w-4 h-4" />}
                  Upgrade to Premium
                </button>
              </div>
            )}
            <div className="rounded-xl border border-purple-200 p-4">
              <p className="font-medium text-gray-900 mb-1">
                White Label <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full ml-1">Ultimate</span>
              </p>
              <p className="text-sm text-gray-500 mb-3">$99/mo — custom domain, branding & priority support.</p>
              {data.plan === 'ultimate' && data.customDomain && (
                <p className="text-xs text-purple-700 bg-purple-50 rounded px-3 py-2 mb-3">
                  Custom domain: <strong>{data.customDomain}</strong>
                  {data.domainVerified ? (
                    <span className="text-green-600 ml-2">(verified)</span>
                  ) : (
                    <span className="text-amber-600 ml-2">(not verified — point CNAME to sinaicamps.com)</span>
                  )}
                </p>
              )}
              <input
                type="text"
                placeholder="bookings.mycamp.com"
                value={upgradeCustomDomain}
                onChange={(e) => setUpgradeCustomDomain(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
              <button
                disabled={upgrading || (!upgradeCustomDomain.trim() && data.plan !== 'premium')}
                onClick={() => doUpgrade('ultimate')}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg flex items-center justify-center gap-2"
              >
                {upgrading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUpCircle className="w-4 h-4" />}
                {data.plan === 'ultimate' ? 'Update Custom Domain' : 'Upgrade to Ultimate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Domain Availability Check (Ultimate + domain not yet set) */}
      {data && data.plan === 'ultimate' && !data.customDomain && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <Globe className="w-5 h-5 text-purple-600" />
            Find a Custom Domain
          </h2>
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="bookings.mycamp.com"
              value={domainCheck}
              onChange={(e) => setDomainCheck(e.target.value)}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
            <button
              disabled={domainChecking || !domainCheck.trim()}
              onClick={checkDomain}
              className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg flex items-center gap-2"
            >
              {domainChecking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
              Check
            </button>
          </div>
          {domainCheckResult && (
            <div className={`mt-3 text-sm flex items-center gap-2 ${domainCheckResult.available ? 'text-green-700' : 'text-red-700'}`}>
              {domainCheckResult.available ? <CheckCircle className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
              {domainCheckResult.available
                ? 'Domain is available! Set it in the upgrade panel above.'
                : domainCheckResult.reason ?? 'Domain is not available.'}
            </div>
          )}
        </div>
      )}

      {/* Current Subdomain/Custom Domain Info */}
      {data && (data.subdomain || data.customDomain) && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
            <Globe className="w-5 h-5 text-blue-600" />
            Domains
          </h2>
          <div className="space-y-2 text-sm">
            {data.subdomain && (
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Subdomain:</span>
                <a href={`https://${data.subdomain}.sinaicamps.com`} target="_blank" rel="noreferrer"
                   className="text-blue-600 hover:underline font-mono">{data.subdomain}.sinaicamps.com</a>
              </div>
            )}
            {data.customDomain && (
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Custom domain:</span>
                <span className="font-mono">{data.customDomain}</span>
                {data.domainVerified
                  ? <CheckCircle className="w-4 h-4 text-green-500" />
                  : <XCircle className="w-4 h-4 text-amber-500" />}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic info */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 space-y-6">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-gray-500" />
            Basic Information
          </h2>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
          )}
          {saved && (
            <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3">Changes saved successfully.</div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Property name</label>
            <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
            <textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Tell guests what makes your property special…" className="input resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">City</label>
              <input type="text" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Country</label>
              <input type="text" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className="input" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Property type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="input capitalize">
                {PROPERTY_TYPES.map((t) => (<option key={t} value={t} className="capitalize">{t}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Currency</label>
              <select value={form.currency_code} onChange={(e) => setForm({ ...form, currency_code: e.target.value })} className="input">
                {CURRENCIES.map((c) => (<option key={c} value={c}>{c}</option>))}
              </select>
            </div>
          </div>
        </div>

        {/* Branding section */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 space-y-6">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Palette className="w-5 h-5 text-indigo-500" />
            Branding
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                <Image className="w-4 h-4 text-gray-400" /> Logo URL
              </label>
              <input type="text" placeholder="https://example.com/logo.png"
                value={branding.logo ?? ''} onChange={(e) => updateBranding('logo', e.target.value)} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                <Image className="w-4 h-4 text-gray-400" /> Hero Image URL
              </label>
              <input type="text" placeholder="https://example.com/hero.jpg"
                value={branding.heroImage ?? ''} onChange={(e) => updateBranding('heroImage', e.target.value)} className="input" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                <span className="inline-block w-4 h-4 rounded border border-gray-300" style={{ backgroundColor: branding.primaryColor || '#cccccc' }} /> Primary Color
              </label>
              <div className="flex gap-2">
                <input type="color" value={branding.primaryColor || '#2563eb'}
                  onChange={(e) => updateBranding('primaryColor', e.target.value)} className="w-10 h-10 rounded border border-gray-200 cursor-pointer" />
                <input type="text" placeholder="#2563eb" value={branding.primaryColor ?? ''}
                  onChange={(e) => updateBranding('primaryColor', e.target.value)} className="input flex-1 font-mono text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                <span className="inline-block w-4 h-4 rounded border border-gray-300" style={{ backgroundColor: branding.secondaryColor || '#cccccc' }} /> Secondary Color
              </label>
              <div className="flex gap-2">
                <input type="color" value={branding.secondaryColor || '#7c3aed'}
                  onChange={(e) => updateBranding('secondaryColor', e.target.value)} className="w-10 h-10 rounded border border-gray-200 cursor-pointer" />
                <input type="text" placeholder="#7c3aed" value={branding.secondaryColor ?? ''}
                  onChange={(e) => updateBranding('secondaryColor', e.target.value)} className="input flex-1 font-mono text-sm" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                <Type className="w-4 h-4 text-gray-400" /> Font Family
              </label>
              <input type="text" placeholder="Inter, sans-serif"
                value={branding.fontFamily ?? ''} onChange={(e) => updateBranding('fontFamily', e.target.value)} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Tagline</label>
              <input type="text" placeholder="Experience the wild…"
                value={branding.tagline ?? ''} onChange={(e) => updateBranding('tagline', e.target.value)} className="input" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-gray-400" /> Contact Email
              </label>
              <input type="email" placeholder="camp@example.com"
                value={branding.contactEmail ?? ''} onChange={(e) => updateBranding('contactEmail', e.target.value)} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                <Phone className="w-4 h-4 text-gray-400" /> Contact Phone
              </label>
              <input type="text" placeholder="+1 234 567 890"
                value={branding.contactPhone ?? ''} onChange={(e) => updateBranding('contactPhone', e.target.value)} className="input" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-gray-400" /> Address
            </label>
            <input type="text" placeholder="123 Camp Road, Wilderness"
              value={branding.address ?? ''} onChange={(e) => updateBranding('address', e.target.value)} className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-gray-400" /> Social Links (JSON)
            </label>
            <input type="text" placeholder='{"instagram":"...","facebook":"..."}'
              value={branding.socialLinks ?? ''} onChange={(e) => updateBranding('socialLinks', e.target.value)} className="input font-mono text-sm" />
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-2">
          <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2 px-6">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Save className="w-4 h-4" /> Save changes</>}
          </button>
        </div>
      </form>
    </div>
  );
}
