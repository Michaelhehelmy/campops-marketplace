'use client';

import { useState, useEffect } from 'react';
import { Calendar, MapPin, Loader2 } from 'lucide-react';

interface Reservation {
  id: string;
  propertyName: string;
  propertySlug: string;
  propertyCity?: string;
  propertyCountry?: string;
  checkIn: string;
  checkOut: string;
  guestCount: number;
  totalPrice: number;
  status: string;
}

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    confirmed: 'bg-green-100 text-green-800',
    'checked-in': 'bg-blue-100 text-blue-800',
    'checked-out': 'bg-gray-100 text-gray-700',
    cancelled: 'bg-red-100 text-red-800',
    pending: 'bg-yellow-100 text-yellow-800',
  };
  return map[status] ?? 'bg-gray-100 text-gray-700';
};

export default function GuestReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/guest/reservations')
      .then((r) => (r.ok ? r.json() : { reservations: [] }))
      .then((data) => setReservations(data.reservations ?? []))
      .catch(() => setReservations([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1">
          Your Stays
        </p>
        <h1 className="text-4xl font-black text-gray-900 tracking-tight">Your Trips</h1>
        <p className="text-gray-500 mt-2">All your reservations and booking history.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-10 w-10 animate-spin text-brand-600" />
        </div>
      ) : reservations.length === 0 ? (
        <div
          className="text-center py-16 bg-white rounded-[2.5rem] border border-gray-100 shadow-sm"
          data-testid="no-reservations"
        >
          <Calendar className="h-16 w-16 text-gray-200 mx-auto mb-4" />
          <h3 className="text-xl font-black text-gray-900 mb-2">No reservations yet</h3>
          <p className="text-gray-500">Start exploring camps and book your first adventure!</p>
        </div>
      ) : (
        <div className="space-y-4" data-testid="guest-reservations-list">
          {reservations.map((r) => (
            <div
              key={r.id}
              data-testid={`reservation-${r.id}`}
              className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:border-brand-200 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3
                    className="font-bold text-lg text-gray-900"
                    data-testid={`reservation-property-${r.id}`}
                  >
                    {r.propertyName}
                  </h3>
                  {(r.propertyCity || r.propertyCountry) && (
                    <div className="flex items-center gap-1 text-sm text-gray-500 mt-0.5">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>{[r.propertyCity, r.propertyCountry].filter(Boolean).join(', ')}</span>
                    </div>
                  )}
                </div>
                <span
                  className={`text-xs font-bold px-3 py-1 rounded-full ${statusBadge(r.status)}`}
                >
                  {r.status}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>
                  {r.checkIn} → {r.checkOut}
                </span>
                <span>•</span>
                <span>
                  {r.guestCount} guest{r.guestCount !== 1 ? 's' : ''}
                </span>
                <span>•</span>
                <span className="font-bold">${r.totalPrice?.toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
