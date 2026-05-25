interface TenantData {
  name: string;
  branding: any;
}

interface Props {
  tenant: TenantData;
  locale: string;
}

export function TenantServicesPage({ tenant }: Props) {
  const services = [
    { title: 'Guided Tours', desc: 'Expert-led excursions across Sinai\'s most breathtaking landscapes.' },
    { title: 'Dining', desc: 'Authentic local cuisine prepared fresh daily.' },
    { title: 'Transportation', desc: 'Airport pickup and drop-off available.' },
    { title: 'Activities', desc: 'Snorkeling, hiking, stargazing, and more.' },
    { title: 'Campfire Evenings', desc: 'Evening gatherings under the stars with stories and music.' },
    { title: 'Wellness', desc: 'Yoga sessions and relaxation experiences.' },
  ];

  return (
    <main className="min-h-screen py-20">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-5xl font-black text-white mb-4">Our Services</h1>
        <p className="text-zinc-400 mb-12 max-w-xl">
          Everything we offer to make your stay unforgettable.
        </p>
        <div className="grid md:grid-cols-3 gap-8">
          {services.map((s) => (
            <div key={s.title} className="rounded-2xl bg-zinc-900/50 p-6 border border-zinc-800">
              <h3 className="text-lg font-bold text-white mb-2">{s.title}</h3>
              <p className="text-sm text-zinc-500">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
