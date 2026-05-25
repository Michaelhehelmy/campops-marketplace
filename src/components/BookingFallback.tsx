'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
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
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [availability, setAvailability] = useState<any>(null);
  const [checking, setChecking] = useState(false);
  const [clientDefaults, setClientDefaults] = useState({ checkIn: '', checkOut: '', guests: '2' });
  const checkInRef = useRef<HTMLInputElement>(null);
  const checkOutRef = useRef<HTMLInputElement>(null);
  const guestsRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setClientDefaults({ checkIn: checkIn || '', checkOut: checkOut || '', guests: '2' });
  }, [checkIn, checkOut]);

  useEffect(() => {
    fetch(`/api/plugins/ui-registry?propertyId=${listingId}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        const hasBookingSlot =
          data.slots && data.slots['public.booking'] && data.slots['public.booking'].length > 0;
        setPluginEnabled(!!hasBookingSlot);
      })
      .catch(() => setPluginEnabled(false));
  }, [listingId]);

  useEffect(() => {
    fetch('/api/csrf-token', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (data.csrfToken) setCsrfToken(data.csrfToken);
      })
      .catch(() => {});
  }, []);

  const handleCheckAvailability = useCallback(async () => {
    const ci = checkInRef.current?.value || checkIn || '';
    const co = checkOutRef.current?.value || checkOut || '';
    if (!ci || !co) return;

    setChecking(true);
    try {
      const token = csrfToken || '';
      const res = await fetch('/api/p/booking/check-availability', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': token,
        },
        body: JSON.stringify({
          propertyId: listingId,
          checkIn: ci,
          checkOut: co,
          guests: parseInt(guestsRef.current?.value || '2'),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setAvailability(data.availableRooms || []);
      }
    } catch {
    } finally {
      setChecking(false);
    }
  }, [listingId, checkIn, checkOut, csrfToken]);

  const handleBookNow = () => {
    const ci = checkInRef.current?.value || checkIn || '';
    const co = checkOutRef.current?.value || checkOut || '';
    const guests = guestsRef.current?.value || '2';
    const params = new URLSearchParams();
    if (ci) params.set('checkIn', ci);
    if (co) params.set('checkOut', co);
    if (guests) params.set('guests', guests);

    const currentPath = window.location.pathname;
    const pathPrefix = `/${locale}`;
    router.push(
      `${pathPrefix}/login?next=${encodeURIComponent(`${pathPrefix}/book/${listingId}?${params.toString()}`)}`
    );
  };

  if (pluginEnabled === false) return null;

  const hasAvailability = availability && availability.length > 0;

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
            defaultValue={clientDefaults.checkIn}
            className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Check-out</label>
          <input
            data-testid="check-out-input"
            ref={checkOutRef}
            type="date"
            defaultValue={clientDefaults.checkOut}
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
          defaultValue={clientDefaults.guests}
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
            onClick={handleCheckAvailability}
            disabled={checking}
            className="flex-1 bg-brand-600 text-white py-2 rounded-lg font-bold hover:bg-brand-700 disabled:opacity-50"
          >
            {checking ? 'Checking...' : 'Check Availability'}
          </button>
          <button
            type="button"
            data-testid="book-now-button"
            onClick={handleBookNow}
            className="flex-1 bg-green-600 text-white py-2 rounded-lg font-bold hover:bg-green-700"
          >
            Book Now
          </button>
        </div>
      )}
      {hasAvailability && (
        <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3 text-center">
          {availability.length} room(s) available!
        </div>
      )}
      {availability && !hasAvailability && (
        <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
          No rooms available for selected dates.
        </div>
      )}
    </div>
  );
}
