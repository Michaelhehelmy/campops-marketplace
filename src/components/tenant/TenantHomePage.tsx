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

interface Props {
  tenant: TenantData;
  locale: string;
}

export function TenantHomePage({ tenant, locale }: Props) {
  const branding = tenant.branding || {};
  const colors = branding.colors || {};
  const heroBg = branding.hero?.backgroundImage || '';
  const tagline = branding.tagline || 'Welcome';

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
            <a
              href={`/${locale}/book`}
              className="px-8 py-3 rounded-xl font-bold text-white transition-all hover:opacity-90"
              style={{ backgroundColor: 'var(--tenant-primary)' }}
            >
              Book Now
            </a>
            <a
              href={`/${locale}/contact`}
              className="px-8 py-3 rounded-xl font-bold text-zinc-300 border border-zinc-700 hover:border-zinc-500 transition-all"
            >
              Contact Us
            </a>
          </div>
        </div>
      </section>

      {/* About Preview */}
      <section className="max-w-7xl mx-auto px-4 py-20">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-4xl font-black text-white mb-6">About {tenant.name}</h2>
            <p className="text-zinc-400 leading-relaxed mb-6">
              {tenant.description || 'Discover the beauty of Sinai with us.'}
            </p>
            <a
              href={`/${locale}/about`}
              className="inline-flex items-center gap-2 font-bold text-white hover:opacity-80 transition-opacity"
              style={{ color: 'var(--tenant-secondary)' }}
            >
              Learn more &rarr;
            </a>
          </div>
          <div className="h-80 rounded-2xl bg-zinc-800/50 flex items-center justify-center text-zinc-600">
            Image Gallery
          </div>
        </div>
      </section>

      {/* Rooms Preview */}
      <section className="bg-zinc-900/50 py-20">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-4xl font-black text-white mb-4 text-center">Our Rooms</h2>
          <p className="text-zinc-400 text-center mb-12 max-w-xl mx-auto">
            Comfortable accommodations for every type of traveler
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl bg-zinc-800/30 p-6 border border-zinc-800">
                <div className="h-40 rounded-xl bg-zinc-700/50 mb-4 flex items-center justify-center text-zinc-600">
                  Room Image
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Room Type {i}</h3>
                <p className="text-sm text-zinc-500 mb-4">Description coming soon.</p>
                <span
                  className="text-sm font-bold"
                  style={{ color: 'var(--tenant-primary)' }}
                >
                  From $XX/night
                </span>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <a
              href={`/${locale}/rooms`}
              className="inline-flex items-center gap-2 font-bold hover:opacity-80 transition-opacity"
              style={{ color: 'var(--tenant-secondary)' }}
            >
              View all rooms &rarr;
            </a>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="max-w-7xl mx-auto px-4 py-20">
        <h2 className="text-4xl font-black text-white mb-8 text-center">Get in Touch</h2>
        <p className="text-zinc-400 text-center mb-12 max-w-xl mx-auto">
          Have questions? Reach out to us.
        </p>
        <div className="max-w-lg mx-auto space-y-4">
          <p className="text-zinc-300 text-center">
            {tenant.city}, {tenant.country}
          </p>
          <div className="text-center">
            <a
              href={`/${locale}/contact`}
              className="inline-block px-8 py-3 rounded-xl font-bold text-white transition-all hover:opacity-90"
              style={{ backgroundColor: 'var(--tenant-primary)' }}
            >
              Contact Form
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
