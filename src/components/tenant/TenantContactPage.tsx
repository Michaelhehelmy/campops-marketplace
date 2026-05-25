interface TenantData {
  name: string;
  branding: any;
}

interface Props {
  tenant: TenantData;
  locale: string;
}

export function TenantContactPage({ tenant }: Props) {
  const contact = tenant.branding?.contact || {};

  return (
    <main className="min-h-screen py-20">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-5xl font-black text-white mb-4">Contact Us</h1>
        <p className="text-zinc-400 mb-12 max-w-xl">
          We&apos;d love to hear from you. Get in touch with {tenant.name}.
        </p>
        <div className="grid md:grid-cols-2 gap-12">
          <div className="space-y-6">
            {contact.email && (
              <div>
                <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-1">Email</h3>
                <a href={`mailto:${contact.email}`} className="text-white hover:underline">
                  {contact.email}
                </a>
              </div>
            )}
            {contact.phone && (
              <div>
                <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-1">Phone</h3>
                <p className="text-white">{contact.phone}</p>
              </div>
            )}
          </div>
          <div className="rounded-2xl bg-zinc-900/50 p-8 border border-zinc-800">
            <p className="text-zinc-500 text-sm">Contact form will be available in a future update.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
