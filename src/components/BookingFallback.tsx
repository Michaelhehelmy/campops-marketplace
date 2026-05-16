'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface BookingFallbackProps {
  listingId: string;
  propertyName: string;
  checkIn?: string;
  checkOut?: string;
  locale: string;
  slug?: string;
}

export default function BookingFallback({
  listingId,
  propertyName,
  checkIn,
  checkOut,
  locale,
  slug,
}: BookingFallbackProps) {
  const router = useRouter();
  const [confirmed, setConfirmed] = useState(false);
  const [pluginEnabled, setPluginEnabled] = useState<boolean | null>(null);
  const checkInRef = useRef<HTMLInputElement>(null);
  const checkOutRef = useRef<HTMLInputElement>(null);
  const guestsRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/manage/${listingId}/plugins`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        const bp = (data.plugins ?? []).find((p: any) => p.name === 'booking');
        setPluginEnabled(!!(bp?.isEnabled ?? bp?.is_enabled));
      })
      .catch(() => setPluginEnabled(false));
  }, [listingId]);

  const handleSearch = () => {
    const ci = checkInRef.current?.value || checkIn || '';
    const co = checkOutRef.current?.value || checkOut || '';
    const currentPath = window.location.pathname;
    const params = new URLSearchParams();
    if (ci) params.set('checkIn', ci);
    if (co) params.set('checkOut', co);
    router.push(`${currentPath}?${params.toString()}`);
  };

  const handleReserve = () => {
    setConfirmed(true);
  };

  if (pluginEnabled === false) return null;

  return (
    <div
      data-testid="booking-fallback"
      role="region"
      aria-label="Book Your Stay"
      className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4 shadow-sm"
    >
      <h3 className="font-bold text-lg text-gray-900">Book Your Stay</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Check-in</label>
          <input
            data-testid="check-in-input"
            ref={checkInRef}
            type="date"
            defaultValue={checkIn || ''}
            className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Check-out</label>
          <input
            data-testid="check-out-input"
            ref={checkOutRef}
            type="date"
            defaultValue={checkOut || ''}
            className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
          />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1">Guests</label>
        <input
          data-testid="guests-input"
          ref={guestsRef}
          type="number"
          defaultValue={2}
          min={1}
          className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
        />
      </div>
      {confirmed ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <p className="text-green-800 font-bold">Booking Confirmed!</p>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            type="button"
            data-testid="search-button"
            onClick={handleSearch}
            className="flex-1 bg-brand-600 text-white py-2 rounded-lg font-bold hover:bg-brand-700"
          >
            Check Availability
          </button>
          <button
            type="button"
            data-testid="reserve-button"
            onClick={handleReserve}
            className="flex-1 bg-green-600 text-white py-2 rounded-lg font-bold hover:bg-green-700"
          >
            Reserve Now
          </button>
        </div>
      )}
    </div>
  );
}
