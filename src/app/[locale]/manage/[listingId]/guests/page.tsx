'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  Users,
  Search,
  Filter,
  Download,
  Mail,
  Phone,
  MapPin,
  Star,
  MoreHorizontal,
  Loader2,
} from 'lucide-react';

export default function GuestsPage() {
  const params = useParams();
  const listingId = params.listingId as string;
  const [view, setView] = useState<'list' | 'profile'>('list');
  const [selectedGuest, setSelectedGuest] = useState<any>(null);
  const [guests, setGuests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGuests();
  }, [listingId]);

  const fetchGuests = async () => {
    try {
      const res = await fetch(`/api/p/crm/guests-by-listing?listingId=${listingId}`);
      const data = await res.json();
      setGuests(data.guests || []);
    } catch (err) {
      console.error('Failed to fetch guests:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-12 w-12 text-brand-600 animate-spin" />
      </div>
    );
  }

  if (view === 'profile') {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <button
          onClick={() => setView('list')}
          className="text-sm font-bold text-gray-500 hover:text-brand-600 flex items-center gap-2"
        >
          &larr; Back to CRM
        </button>
        <div className="bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-xl">
          <h1 className="text-3xl font-black text-gray-900 mb-2">Guest Profile</h1>
          <p className="text-gray-500 mb-8">{selectedGuest?.name}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-3xl bg-gray-50">
              <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">
                Email
              </div>
              <div className="font-bold">{selectedGuest?.email}</div>
            </div>
            <div className="p-6 rounded-3xl bg-gray-50">
              <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">
                Total Stays
              </div>
              <div className="font-bold">{selectedGuest?.stays}</div>
            </div>
            <div className="p-6 rounded-3xl bg-gray-50">
              <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">
                Total Spend
              </div>
              <div className="font-bold">${selectedGuest?.spend}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">CRM</h1>
          <p className="text-gray-500">Searchable guest list and stay history (CRM).</p>
        </div>
        <button className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-200">
          <Download className="h-5 w-5" /> Export CRM
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/40 overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex items-center justify-between">
          <div className="relative w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email or phone..."
              className="w-full pl-12 pr-4 py-3 rounded-2xl border border-gray-100 focus:border-brand-200 transition-all outline-none text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-100 text-xs font-bold text-gray-500 hover:text-gray-900 transition-all">
              <Filter className="h-4 w-4" /> Filters
            </button>
          </div>
        </div>

        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50/50">
              <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
                Guest
              </th>
              <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
                Stays
              </th>
              <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
                Total Spend
              </th>
              <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
                Guest Rating
              </th>
              <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {guests.map((guest) => (
              <tr key={guest.id} className="hover:bg-gray-50/50 transition-all group">
                <td className="px-8 py-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-brand-50 flex items-center justify-center text-brand-600 font-bold">
                      {guest.name
                        .split(' ')
                        .map((n: string) => n[0])
                        .join('')}
                    </div>
                    <div>
                      <div className="font-bold text-gray-900">{guest.name}</div>
                      <div className="text-xs text-gray-400">{guest.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <div className="font-bold text-gray-900">{guest.stays} trips</div>
                  <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest">
                    Last: {guest.lastStay}
                  </div>
                </td>
                <td className="px-8 py-6">
                  <div className="font-black text-gray-900">${guest.spend.toLocaleString()}</div>
                </td>
                <td className="px-8 py-6">
                  <div className="flex gap-0.5">
                    {Array(5)
                      .fill(0)
                      .map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3 w-3 ${i < guest.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`}
                        />
                      ))}
                  </div>
                </td>
                <td className="px-8 py-6 text-right">
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setSelectedGuest(guest);
                      setView('profile');
                    }}
                    className="text-xs font-bold text-brand-600 hover:underline"
                    role="link"
                  >
                    View
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
