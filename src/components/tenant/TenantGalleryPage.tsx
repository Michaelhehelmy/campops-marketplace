interface TenantData {
  name: string;
  branding: any;
}

interface Props {
  tenant: TenantData;
  locale: string;
}

export function TenantGalleryPage({ tenant }: Props) {
  return (
    <main className="min-h-screen py-20">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-5xl font-black text-white mb-4">Gallery</h1>
        <p className="text-zinc-400 mb-12 max-w-xl">
          A glimpse into the {tenant.name} experience.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="aspect-square rounded-2xl bg-zinc-800/50 flex items-center justify-center text-zinc-600 border border-zinc-800"
            >
              Photo {i}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
