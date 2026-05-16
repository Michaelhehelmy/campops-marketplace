import React from 'react';
import Link from 'next/link';
import { MapPin, Users, Download } from 'lucide-react';
import { PluginShell } from '@/app/PluginShell';
import BookingFallback from '@/components/BookingFallback';

interface Props {
  property: any;
  room_types: any[];
  locale: string;
  checkIn?: string;
  checkOut?: string;
  currency?: string;
}

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function ListingDetailView({
  property,
  room_types,
  locale,
  checkIn,
  checkOut,
  currency = 'USD',
}: Props) {
  const settings =
    typeof property.settings === 'string'
      ? JSON.parse(property.settings || '{}')
      : property.settings || {};
  const branding = settings.branding || {};
  const listingStyle = {
    ['--listing-primary' as any]: branding.colors?.primary || '#16a34a',
    ['--listing-secondary' as any]: branding.colors?.secondary || '#22c55e',
    ['--listing-accent' as any]: branding.colors?.accent || '#10b981',
  };
  const headerText = branding.labels?.welcomeMessage || branding.tagline || property.name;

  return (
    <div
      className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
      style={listingStyle as React.CSSProperties}
      data-testid="listing-branding-shell"
    >
      {/* Hero */}
      <div
        className="h-64 md:h-80 rounded-2xl flex items-center justify-center mb-8 text-white overflow-hidden"
        style={{
          backgroundImage:
            'linear-gradient(135deg, var(--listing-primary), var(--listing-secondary))',
        }}
      >
        <div className="text-center px-6" data-testid="listing-brand-header">
          {branding.logo?.url && (
            <img
              src={branding.logo.url}
              alt={`${property.name} logo`}
              className="h-16 w-auto mx-auto mb-4 object-contain"
            />
          )}
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">{headerText}</h1>
          <p className="mt-3 text-white/90 max-w-2xl mx-auto">
            {branding.shortDescription ||
              property.description ||
              'White-labeled booking experience'}
          </p>
        </div>
      </div>

      {/* PWA Banner Slot */}
      <PluginShell
        name="listing.header"
        props={{ listingId: property.id }}
        fallback={<div className="hidden" />}
      />

      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
            <MapPin className="w-4 h-4" />
            <span>{[property.city, property.country].filter(Boolean).join(', ')}</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">{property.name}</h2>
          <p className="mt-3 text-gray-600 max-w-2xl">{property.description}</p>
        </div>
      </div>

      {/* Booking Plugin Slot */}
      <PluginShell
        name="public.booking"
        props={{
          listingId: property.id,
          propertyName: property.name,
          checkIn,
          checkOut,
          currency,
        }}
        fallback={
          <BookingFallback
            listingId={property.id}
            propertyName={property.name}
            checkIn={checkIn}
            checkOut={checkOut}
            locale={locale}
          />
        }
      />

      {/* Resource plugin: public.listing-detail slot */}
      <PluginShell
        name="public.listing-detail"
        props={{ slug: property.slug, listingId: property.id }}
        fallback={null}
      />

      <h2 className="text-xl font-semibold text-gray-900 mt-12 mb-6">Available Units</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {room_types.map((rt: any) => (
          <div
            key={rt.id}
            className="bg-white border border-gray-200 rounded-xl p-5 hover:border-brand-400 transition-all shadow-sm"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">{rt.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{rt.description}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xl font-bold text-gray-900">
                  {formatPrice(rt.base_price, currency)}
                </p>
                <p className="text-xs text-gray-400">/ night</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-6">
              <Users className="w-4 h-4" />
              <span>Up to {rt.capacity} guests</span>
            </div>
            <Link
              href={`/${locale}/book/summary?propertyId=${property.id}&roomTypeId=${rt.id}&checkIn=${checkIn || ''}&checkOut=${checkOut || ''}&currency=${currency}&propertyName=${encodeURIComponent(property.name)}&roomName=${encodeURIComponent(rt.name)}&price=${rt.base_price}`}
              className="block w-full text-center bg-brand-600 text-white py-3 rounded-xl font-semibold hover:bg-brand-700 transition-colors shadow-sm"
            >
              Select Unit
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
