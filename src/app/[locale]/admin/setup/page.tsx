'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

interface BrandingForm {
  // Basic Info
  name: string;
  description: string;
  shortDescription: string;
  tagline: string;

  // Logo & Images
  logoUrl: string;
  logoDarkUrl: string;
  faviconUrl: string;
  heroImageUrl: string;
  bannerImageUrl: string;
  galleryImages: string[];

  // Colors
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;

  // Contact
  email: string;
  phone: string;
  website: string;
  address: string;
  facebook: string;
  instagram: string;
  twitter: string;

  // SEO
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;

  // Credentials for generated .env
  adminEmail: string;
  adminPassword: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';

export default function CampSetupWizardPage() {
  const searchParams = useSearchParams();
  const propertyId = searchParams.get('propertyId');
  const slug = searchParams.get('slug');
  const mode = searchParams.get('mode') || 'create'; // create | edit

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [userId, setUserId] = useState('');
  const [isMaster, setIsMaster] = useState(false);
  const [generatedEnv, setGeneratedEnv] = useState<string | null>(null);

  const [form, setForm] = useState<BrandingForm>({
    name: '',
    description: '',
    shortDescription: '',
    tagline: '',
    logoUrl: '',
    logoDarkUrl: '',
    faviconUrl: '/favicon.ico',
    heroImageUrl: '',
    bannerImageUrl: '',
    galleryImages: [],
    primaryColor: '#0f172a',
    secondaryColor: '#3b82f6',
    accentColor: '#10b981',
    backgroundColor: '#ffffff',
    textColor: '#1e293b',
    email: '',
    phone: '',
    website: '',
    address: '',
    facebook: '',
    instagram: '',
    twitter: '',
    seoTitle: '',
    seoDescription: '',
    seoKeywords: '',
    adminEmail: '',
    adminPassword: '',
  });

  // Load existing branding if editing
  useEffect(() => {
    if (mode === 'edit' && (propertyId || slug)) {
      loadExistingBranding();
    }
  }, [mode, propertyId, slug]);

  const loadExistingBranding = async () => {
    setLoading(true);
    try {
      const params = propertyId ? `propertyId=${propertyId}` : `slug=${slug}`;
      const response = await fetch(`${API_BASE}/api/branding?${params}`);

      if (!response.ok) throw new Error('Failed to load branding');

      const data = await response.json();
      const b = data.branding;

      setForm({
        name: b.name || data.name || '',
        description: b.description || '',
        shortDescription: b.shortDescription || '',
        tagline: b.tagline || '',
        logoUrl: b.logo?.url || '',
        logoDarkUrl: b.logo?.darkUrl || '',
        faviconUrl: b.logo?.favicon || '/favicon.ico',
        heroImageUrl: b.images?.hero || '',
        bannerImageUrl: b.images?.banner || '',
        galleryImages: b.images?.gallery || [],
        primaryColor: b.colors?.primary || '#0f172a',
        secondaryColor: b.colors?.secondary || '#3b82f6',
        accentColor: b.colors?.accent || '#10b981',
        backgroundColor: b.colors?.background || '#ffffff',
        textColor: b.colors?.text || '#1e293b',
        email: b.contact?.email || '',
        phone: b.contact?.phone || '',
        website: b.contact?.website || '',
        address: b.contact?.address || '',
        facebook: b.contact?.social?.facebook || '',
        instagram: b.contact?.social?.instagram || '',
        twitter: b.contact?.social?.twitter || '',
        seoTitle: b.seo?.title || '',
        seoDescription: b.seo?.description || '',
        seoKeywords: b.seo?.keywords?.join(', ') || '',
        adminEmail: '',
        adminPassword: '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const branding = {
        name: form.name,
        description: form.description,
        shortDescription: form.shortDescription,
        tagline: form.tagline,
        logo: {
          url: form.logoUrl,
          darkUrl: form.logoDarkUrl || undefined,
          favicon: form.faviconUrl,
        },
        images: {
          hero: form.heroImageUrl || undefined,
          banner: form.bannerImageUrl || undefined,
          gallery: form.galleryImages.filter((url) => url.trim() !== ''),
        },
        colors: {
          primary: form.primaryColor,
          secondary: form.secondaryColor,
          accent: form.accentColor,
          background: form.backgroundColor,
          text: form.textColor,
        },
        contact: {
          email: form.email,
          phone: form.phone || undefined,
          website: form.website || undefined,
          address: form.address || undefined,
          social: {
            facebook: form.facebook || undefined,
            instagram: form.instagram || undefined,
            twitter: form.twitter || undefined,
          },
        },
        seo: {
          title: form.seoTitle || form.name,
          description: form.seoDescription || form.shortDescription,
          keywords: form.seoKeywords
            .split(',')
            .map((k) => k.trim())
            .filter(Boolean),
        },
      };

      const response = await fetch(`${API_BASE}/api/branding`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId,
          slug,
          branding,
          userId: userId || 'admin',
          isMaster,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to save');
      }

      // Generate .env file
      const envContent = generateEnvFile();
      setGeneratedEnv(envContent);
      setSuccess('Camp branding saved successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const generateEnvFile = () => {
    const slugSafe = (slug || form.name.toLowerCase().replace(/\s+/g, '-')).replace(
      /[^a-z0-9-]/g,
      ''
    );

    return `# Camp Environment Configuration
# Generated for: ${form.name}
# Date: ${new Date().toISOString()}

# ============================================
# SHOP IDENTITY
# ============================================
VITE_SHOP_SLUG=${slugSafe}
VITE_SHOP_NAME="${form.name}"
VITE_API_BASE=${API_BASE || 'https://api.sinaicamps.com'}

# ============================================
# BRANDING
# ============================================
VITE_LOGO_URL=${form.logoUrl}
VITE_LOGO_DARK_URL=${form.logoDarkUrl}
VITE_FAVICON_URL=${form.faviconUrl}
VITE_HERO_IMAGE=${form.heroImageUrl}
VITE_PRIMARY_COLOR=${form.primaryColor}
VITE_SECONDARY_COLOR=${form.secondaryColor}

# ============================================
# CONTACT
# ============================================
VITE_CONTACT_EMAIL=${form.email}
VITE_CONTACT_PHONE=${form.phone}
VITE_CONTACT_ADDRESS="${form.address}"

# ============================================
# ADMIN CREDENTIALS (for initial setup only)
# ============================================
ADMIN_EMAIL=${form.adminEmail || 'admin@' + slugSafe + '.com'}
ADMIN_PASSWORD=${form.adminPassword || 'ChangeMe123!'}

# ============================================
# FEATURES
# ============================================
VITE_ENABLE_BOOKINGS=true
VITE_ENABLE_PAYMENTS=true
VITE_ENABLE_REVIEWS=true
`;
  };

  const downloadEnv = () => {
    if (!generatedEnv) return;
    const blob = new Blob([generatedEnv], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `.env.${slug || form.name.toLowerCase().replace(/\s+/g, '-')}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {mode === 'create' ? 'Create New Camp' : 'Edit Camp Setup'}
          </h1>
          <p className="text-gray-600 mt-2">
            Configure your camp&apos;s branding, contact info, and generate deployment files
          </p>
        </div>

        {/* Auth */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="Your user ID"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div className="flex items-center">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isMaster}
                  onChange={(e) => setIsMaster(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">Marketplace Master</span>
              </label>
            </div>
          </div>
        </div>

        {/* Error/Success */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-6">
            {success}
          </div>
        )}

        {/* Step Indicators */}
        <div className="flex mb-8">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              onClick={() => setStep(s)}
              className={`flex-1 py-2 text-center text-sm font-medium ${
                step === s
                  ? 'bg-blue-600 text-white'
                  : step > s
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-200 text-gray-600'
              }`}
            >
              {s === 1 && 'Basic Info'}
              {s === 2 && 'Images'}
              {s === 3 && 'Colors'}
              {s === 4 && 'Contact'}
              {s === 5 && 'Deploy'}
            </button>
          ))}
        </div>

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <h2 className="text-xl font-semibold mb-4">Basic Information</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Camp Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Safari Adventure Camp"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tagline</label>
              <input
                type="text"
                value={form.tagline}
                onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Experience nature like never before"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Short Description
              </label>
              <input
                type="text"
                value={form.shortDescription}
                onChange={(e) => setForm({ ...form, shortDescription: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Brief description for listings"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Description
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Detailed description of your camp..."
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setStep(2)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Next: Images →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Images */}
        {step === 2 && (
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <h2 className="text-xl font-semibold mb-4">Images & Visual Identity</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
                <input
                  type="text"
                  value={form.logoUrl}
                  onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="https://cdn.example.com/logo.png"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Logo Dark Mode URL
                </label>
                <input
                  type="text"
                  value={form.logoDarkUrl}
                  onChange={(e) => setForm({ ...form, logoDarkUrl: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="https://cdn.example.com/logo-white.png"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Favicon URL</label>
              <input
                type="text"
                value={form.faviconUrl}
                onChange={(e) => setForm({ ...form, faviconUrl: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hero Image URL</label>
              <input
                type="text"
                value={form.heroImageUrl}
                onChange={(e) => setForm({ ...form, heroImageUrl: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Large hero banner image"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Banner Image URL
              </label>
              <input
                type="text"
                value={form.bannerImageUrl}
                onChange={(e) => setForm({ ...form, bannerImageUrl: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Page banner"
              />
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
              >
                ← Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Next: Colors →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Colors */}
        {step === 3 && (
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <h2 className="text-xl font-semibold mb-4">Brand Colors</h2>

            <div className="grid grid-cols-2 gap-4">
              {[
                { key: 'primaryColor', label: 'Primary Color' },
                { key: 'secondaryColor', label: 'Secondary Color' },
                { key: 'accentColor', label: 'Accent Color' },
                { key: 'backgroundColor', label: 'Background' },
                { key: 'textColor', label: 'Text Color' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={form[key as keyof BrandingForm] as string}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      className="h-10 w-10 rounded"
                    />
                    <input
                      type="text"
                      value={form[key as keyof BrandingForm] as string}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setStep(2)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
              >
                ← Back
              </button>
              <button
                onClick={() => setStep(4)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Next: Contact →
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Contact */}
        {step === 4 && (
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <h2 className="text-xl font-semibold mb-4">Contact & Social</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
              <input
                type="text"
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="https://yourcamp.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <textarea
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Facebook</label>
                <input
                  type="text"
                  value={form.facebook}
                  onChange={(e) => setForm({ ...form, facebook: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="@yourcamp"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Instagram</label>
                <input
                  type="text"
                  value={form.instagram}
                  onChange={(e) => setForm({ ...form, instagram: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="@yourcamp"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Twitter</label>
                <input
                  type="text"
                  value={form.twitter}
                  onChange={(e) => setForm({ ...form, twitter: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="@yourcamp"
                />
              </div>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setStep(3)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
              >
                ← Back
              </button>
              <button
                onClick={() => setStep(5)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Next: Deploy →
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Deploy & Credentials */}
        {step === 5 && (
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <h2 className="text-xl font-semibold mb-4">Deployment & Admin Setup</h2>

            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md">
              <p className="text-sm text-yellow-800">
                Set up admin credentials for this camp. These will be included in the generated .env
                file.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Admin Email</label>
                <input
                  type="email"
                  value={form.adminEmail}
                  onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="admin@yourcamp.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Admin Password
                </label>
                <input
                  type="password"
                  value={form.adminPassword}
                  onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Secure password"
                />
              </div>
            </div>

            {/* SEO Section */}
            <div className="border-t pt-4 mt-4">
              <h3 className="font-medium mb-3">SEO Settings</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SEO Title</label>
                  <input
                    type="text"
                    value={form.seoTitle}
                    onChange={(e) => setForm({ ...form, seoTitle: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder={form.name}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    SEO Description
                  </label>
                  <textarea
                    value={form.seoDescription}
                    onChange={(e) => setForm({ ...form, seoDescription: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    SEO Keywords (comma separated)
                  </label>
                  <input
                    type="text"
                    value={form.seoKeywords}
                    onChange={(e) => setForm({ ...form, seoKeywords: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="camping, safari, adventure, nature"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between pt-6 border-t">
              <button
                onClick={() => setStep(4)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
              >
                ← Back
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name || !form.email}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
              >
                {saving ? 'Saving...' : 'Save & Generate .env'}
              </button>
            </div>

            {/* Generated .env Display */}
            {generatedEnv && (
              <div className="mt-6">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-medium">Generated .env File</h3>
                  <button
                    onClick={downloadEnv}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Download .env
                  </button>
                </div>
                <pre className="bg-gray-900 text-green-400 p-4 rounded-md overflow-x-auto text-sm">
                  {generatedEnv}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
