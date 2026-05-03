import { notFound } from "next/navigation";
import Link from "next/link";
import { MapPin, Users, ArrowLeft } from "lucide-react";
import { getProperty } from "@/lib/api";

interface Props {
  params: { locale: string; slug: string };
  searchParams: { checkIn?: string; checkOut?: string; currency?: string };
}

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default async function PropertyPage({ params, searchParams }: Props) {
  const { locale, slug } = params;
  const { checkIn, checkOut, currency = "USD" } = searchParams;

  let data: Awaited<ReturnType<typeof getProperty>>;
  try {
    data = await getProperty(slug, checkIn, checkOut, currency);
  } catch {
    notFound();
  }

  const { property, room_types } = data!;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <Link
        href={`/${locale}/search`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-600 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to search
      </Link>

      {/* Hero */}
      <div className="h-64 md:h-80 rounded-2xl bg-gradient-to-br from-brand-100 to-brand-300 flex items-center justify-center mb-8">
        <span className="text-7xl">🏕️</span>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
            <MapPin className="w-4 h-4" />
            <span>
              {[property.city, property.country].filter(Boolean).join(", ")}
            </span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{property.name}</h1>
          {property.description && (
            <p className="mt-3 text-gray-600 max-w-2xl">{property.description}</p>
          )}
        </div>
      </div>

      {/* Room types */}
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Room types</h2>
      {room_types.length === 0 ? (
        <p className="text-gray-400 py-8 text-center">No rooms available for selected dates</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {room_types.map((rt: any) => (
            <div
              key={rt.id}
              className="bg-white border border-gray-200 rounded-xl p-5 hover:border-brand-400 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{rt.name}</h3>
                  {rt.description && (
                    <p className="text-sm text-gray-500 mt-1">{rt.description}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-bold text-gray-900">
                    {formatPrice(rt.displayPrice ?? rt.base_price, rt.displayCurrency ?? currency)}
                  </p>
                  <p className="text-xs text-gray-400">/ night</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-4">
                <Users className="w-4 h-4" />
                <span>Up to {rt.capacity} guests</span>
              </div>

              {checkIn && checkOut ? (
                <Link
                  href={`/${locale}/book/summary?propertyId=${property.id}&roomTypeId=${rt.id}&checkIn=${checkIn}&checkOut=${checkOut}&currency=${currency}&roomName=${encodeURIComponent(rt.name)}&propertyName=${encodeURIComponent(property.name)}&price=${rt.displayPrice ?? rt.base_price}&priceCurrency=${rt.displayCurrency ?? currency}`}
                  className="block w-full text-center bg-brand-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
                >
                  Book now
                </Link>
              ) : (
                <Link
                  href={`/${locale}/search`}
                  className="block w-full text-center border border-brand-600 text-brand-600 py-2.5 rounded-lg text-sm font-medium hover:bg-brand-50 transition-colors"
                >
                  Check availability
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
