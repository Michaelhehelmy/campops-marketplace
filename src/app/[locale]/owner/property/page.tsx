'use client';

import { useEffect, useState } from 'react';
import { Save, Loader2, ArrowUpCircle, CheckCircle, XCircle } from 'lucide-react';

interface PropertyForm {
  name: string;
  description: string;
  city: string;
  country: string;
  currency_code: string;
  type: string;
}

const CURRENCIES = ['USD', 'EUR', 'GBP', 'AED', 'EGP', 'SAR', 'ZAR'];
const PROPERTY_TYPES = ['camp', 'hotel', 'glamping', 'lodge', 'resort', 'villa'];

export default function OwnerPropertyPage() {
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string>('basic');
  const [form, setForm] = useState<PropertyForm>({
    name: '',
    description: '',
    city: '',
    country: '',
    currency_code: 'USD',
    type: 'camp',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [upgradeSubdomain, setUpgradeSubdomain] = useState('');
  const [upgradeCustomDomain, setUpgradeCustomDomain] = useState('');
  const [upgrading, setUpgrading] = useState(false);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);
  const [upgradeSuccess, setUpgradeSuccess] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/owner/me');
        if (res.ok) {
          const data = await res.json();
          const p = data.property;
          setPropertyId(p.id);
          setCurrentPlan(p.plan ?? 'basic');
          setForm({
            name: p.name ?? '',
            description: p.description ?? '',
            city: p.city ?? '',
            country: p.country ?? '',
            currency_code: p.currency_code ?? 'USD',
            type: p.type ?? 'camp',
          });
        }
      } catch {
        /* ignore */
      }
      setLoading(false);
    })();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!propertyId) return;
    setError(null);
    setSaving(true);

    try {
      const res = await fetch(`/api/properties/${propertyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to save changes.');
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Property</h1>
          <p className="text-gray-500 mt-0.5">Update your public listing details.</p>
        </div>
        <span
          className={`text-xs font-semibold px-3 py-1 rounded-full capitalize ${
            currentPlan === 'ultimate'
              ? 'bg-purple-100 text-purple-800'
              : currentPlan === 'premium'
                ? 'bg-amber-100 text-amber-800'
                : 'bg-slate-100 text-slate-700'
          }`}
        >
          {currentPlan} plan
        </span>
      </div>

      {/* ── Upgrade Panel ──────────────────────────────────────── */}
      {currentPlan !== 'ultimate' && (
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
            {currentPlan === 'basic' && (
              <div className="rounded-xl border border-amber-200 p-4">
                <p className="font-medium text-gray-900 mb-1">
                  Operations Suite{' '}
                  <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full ml-1">
                    Premium
                  </span>
                </p>
                <p className="text-sm text-gray-500 mb-3">
                  $49/mo — full ops panel, plugins & your own subdomain.
                </p>
                <input
                  type="text"
                  placeholder="your-camp (will become your-camp.sinaicamps.com)"
                  value={upgradeSubdomain}
                  onChange={(e) => setUpgradeSubdomain(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <button
                  disabled={upgrading || !upgradeSubdomain.trim()}
                  onClick={async () => {
                    setUpgrading(true);
                    setUpgradeError(null);
                    setUpgradeSuccess(null);
                    const res = await fetch('/api/owner/upgrade', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        siteId: propertyId,
                        newPlan: 'premium',
                        subdomain: upgradeSubdomain.trim(),
                      }),
                    });
                    const data = await res.json();
                    if (!res.ok) {
                      setUpgradeError(data.error);
                    } else {
                      setCurrentPlan('premium');
                      setUpgradeSuccess(
                        'Upgraded to Premium! Your subdomain is being provisioned.'
                      );
                    }
                    setUpgrading(false);
                  }}
                  className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg flex items-center justify-center gap-2"
                >
                  {upgrading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ArrowUpCircle className="w-4 h-4" />
                  )}
                  Upgrade to Premium
                </button>
              </div>
            )}

            <div className="rounded-xl border border-purple-200 p-4">
              <p className="font-medium text-gray-900 mb-1">
                White Label{' '}
                <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full ml-1">
                  Ultimate
                </span>
              </p>
              <p className="text-sm text-gray-500 mb-3">
                $99/mo — custom domain, branding & priority support.
              </p>
              <input
                type="text"
                placeholder="bookings.mycamp.com"
                value={upgradeCustomDomain}
                onChange={(e) => setUpgradeCustomDomain(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
              <button
                disabled={upgrading || !upgradeCustomDomain.trim()}
                onClick={async () => {
                  setUpgrading(true);
                  setUpgradeError(null);
                  setUpgradeSuccess(null);
                  const res = await fetch('/api/owner/upgrade', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      siteId: propertyId,
                      newPlan: 'ultimate',
                      customDomain: upgradeCustomDomain.trim(),
                    }),
                  });
                  const data = await res.json();
                  if (!res.ok) {
                    setUpgradeError(data.error);
                  } else {
                    setCurrentPlan('ultimate');
                    setUpgradeSuccess(
                      'Upgraded to Ultimate! Point your CNAME to sinaicamps.com to complete setup.'
                    );
                  }
                  setUpgrading(false);
                }}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg flex items-center justify-center gap-2"
              >
                {upgrading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowUpCircle className="w-4 h-4" />
                )}
                Upgrade to Ultimate
              </button>
            </div>
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 space-y-6"
      >
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}
        {saved && (
          <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3">
            Changes saved successfully.
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Property name</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="input"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
          <textarea
            rows={4}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Tell guests what makes your property special…"
            className="input resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">City</label>
            <input
              type="text"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Country</label>
            <input
              type="text"
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
              className="input"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Property type</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="input capitalize"
            >
              {PROPERTY_TYPES.map((t) => (
                <option key={t} value={t} className="capitalize">
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Currency</label>
            <select
              value={form.currency_code}
              onChange={(e) => setForm({ ...form, currency_code: e.target.value })}
              className="input"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary flex items-center gap-2 px-6"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Saving…
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> Save changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
