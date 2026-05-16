'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, CheckCircle2, LogOut, X, Plus } from 'lucide-react';

interface Booking {
  id: string;
  guestName: string;
  guestEmail: string;
  checkIn: string;
  checkOut: string;
  guestCount: number;
  totalPrice: number;
  status: string;
  notes?: string;
}

export default function BookingsPage() {
  const params = useParams();
  const listingId = params.listingId as string;

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [manageModal, setManageModal] = useState<Booking | null>(null);
  const [modalNotes, setModalNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/manage/${listingId}/bookings`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setBookings(data.bookings ?? []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handleCheckIn = async (bookingId: string) => {
    await fetch(`/api/manage/${listingId}/bookings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: bookingId, status: 'checked-in' }),
    });
    fetchBookings();
  };

  const handleCheckOut = async (bookingId: string) => {
    await fetch(`/api/manage/${listingId}/bookings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: bookingId, status: 'checked-out' }),
    });
    fetchBookings();
  };

  const openManage = (b: Booking) => {
    setManageModal(b);
    setModalNotes(b.notes ?? '');
  };

  const handleSaveChanges = async () => {
    if (!manageModal) return;
    setSaving(true);
    await fetch(`/api/manage/${listingId}/bookings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: manageModal.id, notes: modalNotes }),
    });
    setSaving(false);
    setManageModal(null);
    fetchBookings();
  };

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-10 w-10 text-brand-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return <div className="p-8 text-red-600">Error loading bookings: {error}</div>;
  }

  return (
    <div className="space-y-6" data-testid="bookings-page">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-gray-900">Manage Bookings</h1>
        <button
          data-testid="add-booking-btn"
          className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-brand-700 transition-colors"
        >
          <Plus className="h-4 w-4" /> Add Booking
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left" data-testid="manager-bookings-list">
          <thead>
            <tr className="bg-gray-50 text-xs font-black uppercase tracking-widest text-gray-400">
              <th className="px-6 py-4">Guest</th>
              <th className="px-6 py-4">Dates</th>
              <th className="px-6 py-4">Guests</th>
              <th className="px-6 py-4">Total</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {bookings.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                  No bookings found.
                </td>
              </tr>
            )}
            {bookings.map((b) => (
              <tr
                key={b.id}
                className="hover:bg-gray-50/50 transition-all"
                data-testid={`booking-row-${b.id}`}
              >
                <td className="px-6 py-4">
                  <div className="font-bold text-gray-900">{b.guestName}</div>
                  <div className="text-xs text-gray-400">{b.guestEmail}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-700">{b.checkIn}</div>
                  <div className="text-xs text-gray-400">→ {b.checkOut}</div>
                </td>
                <td className="px-6 py-4 text-sm">{b.guestCount}</td>
                <td className="px-6 py-4 text-sm font-bold">${b.totalPrice?.toLocaleString()}</td>
                <td className="px-6 py-4">
                  <span
                    className={`text-xs font-bold px-2 py-1 rounded-full ${statusBadge(b.status)}`}
                  >
                    {b.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    {b.status === 'confirmed' && (
                      <button
                        data-testid={`check-in-button-${b.id}`}
                        onClick={() => handleCheckIn(b.id)}
                        className="flex items-center gap-1 text-xs font-bold bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        <CheckCircle2 className="h-3 w-3" /> Check-in
                      </button>
                    )}
                    {b.status === 'checked-in' && (
                      <button
                        data-testid={`check-out-button-${b.id}`}
                        onClick={() => handleCheckOut(b.id)}
                        className="flex items-center gap-1 text-xs font-bold bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        <LogOut className="h-3 w-3" /> Check-out
                      </button>
                    )}
                    <button
                      data-testid={`manage-button-${b.id}`}
                      onClick={() => openManage(b)}
                      className="text-xs font-bold text-brand-600 hover:underline px-2"
                    >
                      Manage
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Manage Modal */}
      {manageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div
            className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md"
            data-testid="manage-booking-modal"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-gray-900">Manage Booking</h2>
              <button onClick={() => setManageModal(null)}>
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-1">
              Guest: <span className="font-bold text-gray-900">{manageModal.guestName}</span>
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Dates: {manageModal.checkIn} → {manageModal.checkOut}
            </p>
            <div className="mb-4">
              <label htmlFor="booking-notes" className="block text-sm font-bold text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                id="booking-notes"
                data-testid="booking-notes-input"
                value={modalNotes}
                onChange={(e) => setModalNotes(e.target.value)}
                className="w-full border border-gray-200 rounded-xl p-3 text-sm resize-none h-24 focus:ring-2 focus:ring-brand-500 outline-none"
                placeholder="Add notes about this booking..."
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSaveChanges}
                disabled={saving}
                data-testid="save-changes-btn"
                className="flex-1 bg-brand-600 text-white py-2.5 rounded-xl font-bold hover:bg-brand-700 disabled:opacity-60 transition-colors"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={() => setManageModal(null)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 font-bold text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
