interface RoomData {
  id?: string;
  name?: string;
  description?: string;
  price?: string | number;
  image?: string;
}

interface TenantData {
  id: string;
  slug?: string;
  name: string;
  branding: any;
  settings?: any;
}

interface Props {
  tenant: TenantData;
  locale: string;
}

function bookingHref(locale: string, tenant: TenantData) {
  return `/${locale}/book/${tenant.id}`;
}

function contactHref(locale: string, tenant: TenantData) {
  return `/${locale}/${tenant.slug ?? ''}/contact`;
}

export function TenantRoomsPage({ tenant, locale }: Props) {
  const rooms: RoomData[] | undefined = tenant.settings?.rooms;

  const hasRooms = Array.isArray(rooms) && rooms.length > 0;

  return (
    <main className="min-h-screen py-20">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-5xl font-black text-white mb-4">Room Types</h1>
        <p className="text-zinc-400 mb-12 max-w-xl">
          Choose the accommodation that suits your needs.
        </p>

        {!hasRooms && (
          <p className="text-zinc-500 text-center mb-8">
            Room details are being added. Please check back soon or contact us for more information.
          </p>
        )}

        <div className="grid md:grid-cols-3 gap-8">
          {(hasRooms ? rooms : [1, 2, 3]).map((room: RoomData | number, idx: number) => {
            if (typeof room === 'number') {
              return (
                <div key={room} className="rounded-2xl bg-zinc-900/50 border border-zinc-800 overflow-hidden">
                  <div className="h-48 bg-zinc-800/50 flex items-center justify-center text-zinc-600">
                    Room Image
                  </div>
                  <div className="p-6">
                    <h3 className="text-lg font-bold text-white mb-2">Room Type {room}</h3>
                    <p className="text-sm text-zinc-500 mb-4">Coming soon</p>
                    <a
                      href={contactHref(locale, tenant as any)}
                      className="inline-block px-6 py-2 rounded-xl text-sm font-bold text-zinc-300 border border-zinc-700 hover:border-zinc-500 transition-all"
                    >
                      Contact us to inquire
                    </a>
                  </div>
                </div>
              );
            }

            return (
              <div key={room.id || idx} className="rounded-2xl bg-zinc-900/50 border border-zinc-800 overflow-hidden">
                <div
                  className="h-48 bg-zinc-800/50 flex items-center justify-center text-zinc-600"
                  style={room.image ? { backgroundImage: `url(${room.image})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
                >
                  {!room.image && 'Room Image'}
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-bold text-white mb-2">{room.name || `Room Type ${idx + 1}`}</h3>
                  <p className="text-sm text-zinc-500 mb-4">{room.description || 'Details coming soon.'}</p>
                  <div className="flex items-center justify-between">
                    {room.price && (
                      <span className="text-sm font-bold" style={{ color: 'var(--tenant-primary)' }}>
                        From ${typeof room.price === 'number' ? room.price : room.price}/night
                      </span>
                    )}
                    <a
                      href={bookingHref(locale, tenant as any)}
                      className="inline-block px-6 py-2 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
                      style={{ backgroundColor: 'var(--tenant-primary)' }}
                    >
                      Book Now
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
