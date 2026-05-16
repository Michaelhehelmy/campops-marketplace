'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Palette, Image, Type, Globe, Phone, MapPin } from 'lucide-react';

const PROPERTY_TYPES = ['camp', 'hotel', 'glamping', 'lodge', 'resort', 'villa'];
const CURRENCIES = ['USD', 'EUR', 'GBP', 'AED', 'EGP', 'SAR', 'ZAR', 'KES', 'CHF', 'AUD'];
const TIMEZONES = [
  'UTC',
  'Africa/Nairobi',
  'Europe/Zurich',
  'America/New_York',
  'Asia/Dubai',
  'Australia/Sydney',
];
const FONT_OPTIONS = [
  'Inter',
  'Playfair Display',
  'Roboto',
  'Open Sans',
  'Georgia',
  'Merriweather',
  'Poppins',
];

const DEFAULT_COLORS = {
  safari: { primary: '#8B4513', secondary: '#D2691E', accent: '#228B22' },
  alpine: { primary: '#2F4F4F', secondary: '#708090', accent: '#B22222' },
  beach: { primary: '#0077BE', secondary: '#87CEEB', accent: '#FFD700' },
  luxury: { primary: '#1a1a1a', secondary: '#c9a962', accent: '#ffffff' },
};

export default function StepBrandingPage() {
  const router = useRouter();
  const { locale } = useParams();

  const [activeTab, setActiveTab] = useState<'identity' | 'visual' | 'contact' | 'business'>(
    'identity'
  );

  const [form, setForm] = useState({
    // Identity
    property_name: '',
    slug: '',
    type: 'camp',
    description: '',
    shortDescription: '',
    tagline: '',

    // Visual
    logoUrl: '',
    heroImageUrl: '',
    primaryColor: '#0f172a',
    secondaryColor: '#3b82f6',
    accentColor: '#10b981',
    headingFont: 'Inter',
    bodyFont: 'Inter',

    // Contact
    email: '',
    phone: '',
    website: '',
    address: '',
    city: '',
    country: '',
    facebook: '',
    instagram: '',
    twitter: '',

    // Business
    currency_code: 'USD',
    timezone: 'UTC',
    checkinTime: '14:00',
    checkoutTime: '11:00',
  });

  const [slugEdited, setSlugEdited] = useState(false);

  function toSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 40);
  }

  const handleNameChange = (v: string) => {
    setForm((f) => ({
      ...f,
      property_name: v,
      slug: slugEdited ? f.slug : toSlug(v),
    }));
  };

  const applyColorPreset = (preset: keyof typeof DEFAULT_COLORS) => {
    const colors = DEFAULT_COLORS[preset];
    setForm((f) => ({
      ...f,
      primaryColor: colors.primary,
      secondaryColor: colors.secondary,
      accentColor: colors.accent,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Save to session and go to plan selection
    sessionStorage.setItem(
      'reg_step2',
      JSON.stringify({
        property_name: form.property_name,
        slug: form.slug,
        type: form.type,
        city: form.city,
        country: form.country,
        currency_code: form.currency_code,
      })
    );
    sessionStorage.setItem(
      'reg_branding',
      JSON.stringify({
        description: form.description,
        shortDescription: form.shortDescription,
        tagline: form.tagline,
        logo: { url: form.logoUrl },
        images: { hero: form.heroImageUrl },
        colors: {
          primary: form.primaryColor,
          secondary: form.secondaryColor,
          accent: form.accentColor,
        },
        typography: {
          headingFont: form.headingFont,
          bodyFont: form.bodyFont,
        },
        contact: {
          email: form.email,
          phone: form.phone,
          website: form.website,
          address: form.address,
          social: {
            facebook: form.facebook,
            instagram: form.instagram,
            twitter: form.twitter,
          },
        },
        business: {
          checkinTime: form.checkinTime,
          checkoutTime: form.checkoutTime,
          timezone: form.timezone,
          currency: form.currency_code,
        },
      })
    );
    router.push(`/${locale}/list-your-camp/plan`);
  };

  const tabs = [
    { id: 'identity', label: 'Identity', icon: Type },
    { id: 'visual', label: 'Visual', icon: Palette },
    { id: 'contact', label: 'Contact', icon: Phone },
    { id: 'business', label: 'Business', icon: MapPin },
  ];

  return (
    <div>
      <div className="mb-8">
        <div className="flex gap-2 mb-6">
          {['Account', 'Branding', 'Plan', 'Done'].map((label, i) => (
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
        <h1 className="text-2xl font-bold text-gray-900">Customize your camp branding</h1>
        <p className="text-gray-500 mt-1">
          Make your camp unique with custom colors, images, and content.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors
              ${
                activeTab === tab.id
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8"
      >
        {/* IDENTITY TAB */}
        {activeTab === 'identity' && (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Camp name *</label>
              <input
                type="text"
                required
                value={form.property_name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Acacia Safari Camp"
                className="input w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                URL slug{' '}
                <span className="text-xs font-normal text-gray-400">(your custom domain)</span>
              </label>
              <div className="flex items-center">
                <span className="px-3 py-2.5 bg-gray-100 border border-r-0 border-gray-200 rounded-l-lg text-sm text-gray-500">
                  campops.com/stay/
                </span>
                <input
                  type="text"
                  required
                  value={form.slug}
                  onChange={(e) => {
                    setSlugEdited(true);
                    setForm({
                      ...form,
                      slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                    });
                  }}
                  placeholder="acacia-safari-camp"
                  className="input rounded-l-none flex-1"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Property type
              </label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="input w-full capitalize"
              >
                {PROPERTY_TYPES.map((t) => (
                  <option key={t} value={t} className="capitalize">
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Tagline</label>
              <input
                type="text"
                value={form.tagline}
                onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                placeholder="Where adventure meets comfort"
                className="input w-full"
              />
              <p className="text-xs text-gray-400 mt-1">
                Short catchy phrase that appears under your camp name
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Short description
              </label>
              <input
                type="text"
                value={form.shortDescription}
                onChange={(e) => setForm({ ...form, shortDescription: e.target.value })}
                placeholder="Luxury safari camp in the Serengeti"
                className="input w-full"
              />
              <p className="text-xs text-gray-400 mt-1">
                Brief description for listings (50-100 characters)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Full description
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Experience nature at its finest..."
                rows={4}
                className="input w-full"
              />
            </div>
          </div>
        )}

        {/* VISUAL TAB */}
        {activeTab === 'visual' && (
          <div className="space-y-5">
            {/* Color Presets */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quick color presets
              </label>
              <div className="flex gap-3">
                {Object.entries(DEFAULT_COLORS).map(([name, colors]) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => applyColorPreset(name as any)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:border-brand-300 transition-colors"
                  >
                    <div className="flex">
                      <div className="w-4 h-4 rounded-l" style={{ background: colors.primary }} />
                      <div className="w-4 h-4" style={{ background: colors.secondary }} />
                      <div className="w-4 h-4 rounded-r" style={{ background: colors.accent }} />
                    </div>
                    <span className="text-sm capitalize">{name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Colors */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Primary color
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={form.primaryColor}
                    onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                    className="w-10 h-10 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={form.primaryColor}
                    onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                    className="input flex-1"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Secondary color
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={form.secondaryColor}
                    onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })}
                    className="w-10 h-10 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={form.secondaryColor}
                    onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })}
                    className="input flex-1"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Accent color
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={form.accentColor}
                    onChange={(e) => setForm({ ...form, accentColor: e.target.value })}
                    className="w-10 h-10 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={form.accentColor}
                    onChange={(e) => setForm({ ...form, accentColor: e.target.value })}
                    className="input flex-1"
                  />
                </div>
              </div>
            </div>

            {/* Fonts */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Heading font
                </label>
                <select
                  value={form.headingFont}
                  onChange={(e) => setForm({ ...form, headingFont: e.target.value })}
                  className="input w-full"
                >
                  {FONT_OPTIONS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Body font</label>
                <select
                  value={form.bodyFont}
                  onChange={(e) => setForm({ ...form, bodyFont: e.target.value })}
                  className="input w-full"
                >
                  {FONT_OPTIONS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Images */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Logo URL</label>
              <input
                type="url"
                value={form.logoUrl}
                onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                placeholder="https://cdn.example.com/logo.png"
                className="input w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Hero image URL
              </label>
              <input
                type="url"
                value={form.heroImageUrl}
                onChange={(e) => setForm({ ...form, heroImageUrl: e.target.value })}
                placeholder="https://cdn.example.com/hero.jpg"
                className="input w-full"
              />
              <p className="text-xs text-gray-400 mt-1">
                Main image on your homepage (recommended: 1920x1080)
              </p>
            </div>
          </div>
        )}

        {/* CONTACT TAB */}
        {activeTab === 'contact' && (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email *</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="hello@yourcamp.com"
                className="input w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+1 (555) 123-4567"
                className="input w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Website</label>
              <input
                type="url"
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                placeholder="https://yourcamp.com"
                className="input w-full"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">City</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="Nairobi"
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Country</label>
                <input
                  type="text"
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                  placeholder="Kenya"
                  className="input w-full"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full address</label>
              <textarea
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="123 Savanna Road, Maasai Mara, Kenya"
                rows={2}
                className="input w-full"
              />
            </div>

            <div className="border-t border-gray-200 pt-5">
              <label className="block text-sm font-medium text-gray-700 mb-3">Social media</label>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-gray-500">Facebook</label>
                  <input
                    type="url"
                    value={form.facebook}
                    onChange={(e) => setForm({ ...form, facebook: e.target.value })}
                    placeholder="facebook.com/yourcamp"
                    className="input w-full text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Instagram</label>
                  <input
                    type="text"
                    value={form.instagram}
                    onChange={(e) => setForm({ ...form, instagram: e.target.value })}
                    placeholder="@yourcamp"
                    className="input w-full text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Twitter</label>
                  <input
                    type="text"
                    value={form.twitter}
                    onChange={(e) => setForm({ ...form, twitter: e.target.value })}
                    placeholder="@yourcamp"
                    className="input w-full text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* BUSINESS TAB */}
        {activeTab === 'business' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Currency</label>
                <select
                  value={form.currency_code}
                  onChange={(e) => setForm({ ...form, currency_code: e.target.value })}
                  className="input w-full"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Timezone</label>
                <select
                  value={form.timezone}
                  onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                  className="input w-full"
                >
                  {TIMEZONES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Check-in time
                </label>
                <input
                  type="time"
                  value={form.checkinTime}
                  onChange={(e) => setForm({ ...form, checkinTime: e.target.value })}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Check-out time
                </label>
                <input
                  type="time"
                  value={form.checkoutTime}
                  onChange={(e) => setForm({ ...form, checkoutTime: e.target.value })}
                  className="input w-full"
                />
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 pt-6 border-t border-gray-200 mt-6">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 px-5 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            ← Back
          </button>
          {activeTab !== 'business' ? (
            <button
              type="button"
              onClick={() => {
                const tabs = ['identity', 'visual', 'contact', 'business'];
                const currentIndex = tabs.indexOf(activeTab);
                if (currentIndex < tabs.length - 1) {
                  setActiveTab(tabs[currentIndex + 1] as any);
                }
              }}
              className="btn-primary flex-1"
            >
              Next →
            </button>
          ) : (
            <button type="submit" className="btn-primary flex-1">
              Continue to plan →
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
