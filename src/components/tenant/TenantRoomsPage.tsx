interface TenantData {
  name: string;
  branding: any;
}

interface Props {
  tenant: TenantData;
  locale: string;
}

export function TenantRoomsPage({ tenant }: Props) {
  return (
    <main className="min-h-screen py-20">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-5xl font-black text-white mb-4">Room Types</h1>
        <p className="text-zinc-400 mb-12 max-w-xl">
          Choose the accommodation that suits your needs.
        </p>
        <div className="grid md:grid-cols-3 gap-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl bg-zinc-900/50 border border-zinc-800 overflow-hidden">
              <div className="h-48 bg-zinc-800/50 flex items-center justify-center text-zinc-600">
                Room Image
              </div>
              <div className="p-6">
                <h3 className="text-lg font-bold text-white mb-2">Room Type {i}</h3>
                <p className="text-sm text-zinc-500 mb-4">Details coming soon.</p>
                <a
                  href="/book"
                  className="inline-block px-6 py-2 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
                  style={{ backgroundColor: 'var(--tenant-primary)' }}
                >
                  Book Now
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
