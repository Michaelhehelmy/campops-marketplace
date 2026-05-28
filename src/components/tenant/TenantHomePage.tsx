'use client';

import { useTranslations } from 'next-intl';

interface TenantData {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  city: string;
  country: string;
  branding: any;
  settings: any;
  plan: string;
}

function tenantHref(locale: string, tenant: TenantData, path: string) {
  return `/${locale}/${tenant.slug}${path}`;
}

function bookingHref(locale: string, tenant: TenantData) {
  return `/${locale}/book/${tenant.id}`;
}

interface Props {
  tenant: TenantData;
  locale: string;
}

export function TenantHomePage({ tenant, locale }: Props) {
  const t = useTranslations('tenant');
  const branding = tenant.branding || {};
  const colors = branding.colors || {};
  const heroBg = branding.hero?.backgroundImage || '';
  const tagline = branding.tagline || t('welcomeTo');

  return (
    <main>
      {/* Hero */}
      <section
        className="relative min-h-[70vh] flex items-center justify-center"
        style={
          heroBg
            ? { backgroundImage: `url(${heroBg})`, backgroundSize: 'cover', backgroundPosition: 'center' }
            : { background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }
        }
      >
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 text-center px-4">
          <h1 className="text-5xl md:text-7xl font-black text-white mb-4">{tenant.name}</h1>
          <p className="text-xl text-zinc-300 max-w-2xl mx-auto mb-8">{tagline}</p>
          {tenant.description && (
            <p className="text-zinc-400 max-w-xl mx-auto">{tenant.description}</p>
          )}
          <div className="mt-8 flex gap-4 justify-center">
            {tenant.settings?.bookingEnabled !== false ? (
              <a
                href={bookingHref(locale, tenant)}
                className="px-8 py-3 rounded-xl font-bold text-white transition-all hover:opacity-90"
                style={{ backgroundColor: 'var(--tenant-primary)' }}
              >
                {t('bookNow')}
              </a>
            ) : (
              <span className="px-8 py-3 rounded-xl italic text-zinc-400 border border-zinc-700">
                {t('contactToInquire')}
              </span>
            )}
            <a
              href={tenantHref(locale, tenant, '/contact')}
              className="px-8 py-3 rounded-xl font-bold text-zinc-300 border border-zinc-700 hover:border-zinc-500 transition-all"
            >
              {t('contactUs')}
            </a>
          </div>
        </div>
      </section>

      {/* About Preview */}
      <section className="max-w-7xl mx-auto px-4 py-20">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-4xl font-black text-white mb-6">{t('aboutUs', { name: tenant.name })}</h2>
            <p className="text-zinc-400 leading-relaxed mb-6">
              {tenant.description || t('aboutPreview')}
            </p>
            <a
              href={tenantHref(locale, tenant, '/about')}
              className="inline-flex items-center gap-2 font-bold text-white hover:opacity-80 transition-opacity"
              style={{ color: 'var(--tenant-secondary)' }}
            >
              {t('learnMore')} →
            </a>
          </div>
          <div className="h-80 rounded-2xl bg-zinc-800/50 flex items-center justify-center text-zinc-600">
            {t('placeholderImage')}
          </div>
        </div>
      </section>

      {/* Rooms Preview */}
      <section className="bg-zinc-900/50 py-20">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-4xl font-black text-white mb-4 text-center">{t('ourRooms')}</h2>
          <p className="text-zinc-400 text-center mb-12 max-w-xl mx-auto">
            {t('roomsSubtitle')}
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl bg-zinc-800/30 p-6 border border-zinc-800">
                <div className="h-40 rounded-xl bg-zinc-700/50 mb-4 flex items-center justify-center text-zinc-600">
                  {t('roomImage')}
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{t('roomType', { i })}</h3>
                <p className="text-sm text-zinc-500 mb-4">{t('roomDesc')}</p>
                <span
                  className="text-sm font-bold"
                  style={{ color: 'var(--tenant-primary)' }}
                >
                  {t('fromPrice', { price: '$XX' })}
                </span>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <a
              href={tenantHref(locale, tenant, '/rooms')}
              className="inline-flex items-center gap-2 font-bold hover:opacity-80 transition-opacity"
              style={{ color: 'var(--tenant-secondary)' }}
            >
              {t('viewAllRooms')} →
            </a>
          </div>
        </div>
      </section>

      {/* Reviews Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-10">{t('whatGuestsSay')}</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {/* Review cards */}
            <div className="bg-white p-6 rounded-2xl shadow-sm">
              <div className="flex text-amber-400 mb-3">{t('starRating')}</div>
              <p className="text-gray-600 mb-4">{t('review1')}</p>
              <p className="font-semibold">{t('reviewer1')}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm">
              <div className="flex text-amber-400 mb-3">{t('starRating')}</div>
              <p className="text-gray-600 mb-4">{t('review2')}</p>
              <p className="font-semibold">{t('reviewer2')}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm">
              <div className="flex text-amber-400 mb-3">{t('starRating4')}</div>
              <p className="text-gray-600 mb-4">{t('review3')}</p>
              <p className="font-semibold">{t('reviewer3')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="max-w-7xl mx-auto px-4 py-20">
        <h2 className="text-4xl font-black text-white mb-8 text-center">{t('getInTouch')}</h2>
        <p className="text-zinc-400 text-center mb-12 max-w-xl mx-auto">
          {t('getInTouchDesc')}
        </p>
        <div className="max-w-lg mx-auto space-y-4">
          <p className="text-zinc-300 text-center">
            {tenant.city}, {tenant.country}
          </p>
          <div className="text-center">
            <a
              href={tenantHref(locale, tenant, '/contact')}
              className="inline-block px-8 py-3 rounded-xl font-bold text-white transition-all hover:opacity-90"
              style={{ backgroundColor: 'var(--tenant-primary)' }}
            >
              {t('contactForm')}
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}


