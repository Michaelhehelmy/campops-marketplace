interface TenantData {
  name: string;
  description: string | null;
  branding: any;
}

interface Props {
  tenant: TenantData;
  locale: string;
}

export function TenantAboutPage({ tenant }: Props) {
  return (
    <main className="min-h-screen py-20">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-5xl font-black text-white mb-8">About {tenant.name}</h1>
        <div className="prose prose-invert max-w-none">
          <p className="text-zinc-400 leading-relaxed text-lg">
            {tenant.description || 'Details about the camp coming soon.'}
          </p>
          <div className="mt-8 h-64 rounded-2xl bg-zinc-800/50 flex items-center justify-center text-zinc-600">
            About Image
          </div>
        </div>
      </div>
    </main>
  );
}
