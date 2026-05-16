'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Building2, MapPin, Globe } from 'lucide-react';

const PROPERTY_TYPES = ['camp', 'hotel', 'glamping', 'lodge', 'resort', 'villa'];
const CURRENCIES = ['USD', 'EUR', 'GBP', 'AED', 'EGP', 'SAR', 'ZAR'];

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 40);
}

export default function Step2PropertyPage() {
  const router = useRouter();
  const { locale } = useParams();

  const [form, setForm] = useState({
    property_name: '',
    slug: '',
    type: 'camp',
    city: '',
    country: '',
    currency_code: 'USD',
  });
  const [slugEdited, setSlugEdited] = useState(false);

  const handleNameChange = (v: string) => {
    setForm((f) => ({
      ...f,
      property_name: v,
      slug: slugEdited ? f.slug : toSlug(v),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sessionStorage.setItem('reg_step2', JSON.stringify(form));
    router.push(`/${locale}/list-your-camp/plan`);
  };

  return (
    <div>
      <div className="mb-8">
        <div className="flex gap-2 mb-6">
          {['Account', 'Property', 'Plan', 'Done'].map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                ${i <= 1 ? 'bg-brand-600 text-white' : 'bg-gray-200 text-gray-400'}`}
              >
                {i + 1}
              </div>
              {i < 3 && <div className={`h-0.5 w-12 ${i < 1 ? 'bg-brand-600' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Tell us about your property</h1>
        <p className="text-gray-500 mt-1">This will appear on your public listing.</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-5"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Property name</label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              required
              value={form.property_name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Acacia Safari Camp"
              className="input pl-10"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            URL slug{' '}
            <span className="text-xs font-normal text-gray-400">(used in your listing URL)</span>
          </label>
          <div className="flex items-center">
            <span className="px-3 py-2.5 bg-gray-100 border border-r-0 border-gray-200 rounded-l-lg text-sm text-gray-500">
              campops.com/stay/
            </span>
            <input
              type="text"
              required
              pattern="[a-z0-9-]{3,40}"
              value={form.slug}
              onChange={(e) => {
                setSlugEdited(true);
                setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') });
              }}
              placeholder="acacia-safari-camp"
              className="input rounded-l-none flex-1"
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">
            3–40 lowercase letters, numbers, hyphens only.
          </p>
        </div>

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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">City</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="Nairobi"
                className="input pl-10"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Country</label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                placeholder="Kenya"
                className="input pl-10"
              />
            </div>
          </div>
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

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 px-5 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            ← Back
          </button>
          <button type="submit" className="btn-primary flex-1">
            Continue to plan →
          </button>
        </div>
      </form>
    </div>
  );
}
