'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  Store,
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  XCircle,
  Users,
  Maximize2,
  Loader2,
} from 'lucide-react';

export default function RoomsPage() {
  const params = useParams();
  const listingId = params.listingId as string;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRoom, setNewRoom] = useState({ name: '', price: '200' });
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchRooms();
  }, [listingId]);

  const fetchRooms = async () => {
    try {
      const res = await fetch(`/api/manage/${listingId}/rooms`);
      const data = await res.json();
      setRooms(data.rooms || []);
    } catch (err) {
      console.error('Failed to fetch rooms:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!newRoom.name) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/manage/${listingId}/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newRoom.name,
          price: parseInt(newRoom.price) || 0,
          capacity: 2,
        }),
      });
      if (res.ok) {
        setIsModalOpen(false);
        setNewRoom({ name: '', price: '200' });
        fetchRooms();
      }
    } catch (err) {
      console.error('Failed to create room:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Inventory</h1>
          <p className="text-gray-500">Manage unit types, pricing, and specific availability.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-brand-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-brand-700 transition-all shadow-xl shadow-brand-100"
        >
          <Plus className="h-5 w-5" /> Add Room Type
        </button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-black text-gray-900 mb-6">Create Room Type</h3>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="roomName"
                  className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2"
                >
                  Name
                </label>
                <input
                  id="roomName"
                  type="text"
                  value={newRoom.name}
                  onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-100 focus:border-brand-200 focus:ring-4 focus:ring-brand-50 outline-none transition-all"
                  placeholder="Deluxe Suite"
                />
              </div>
              <div>
                <label
                  htmlFor="basePrice"
                  className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2"
                >
                  Base Price
                </label>
                <input
                  id="basePrice"
                  type="number"
                  value={newRoom.price}
                  onChange={(e) => setNewRoom({ ...newRoom, price: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-100 focus:border-brand-200 focus:ring-4 focus:ring-brand-50 outline-none transition-all"
                  placeholder="500"
                />
              </div>
              <div className="flex gap-3 mt-8">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-4 rounded-2xl font-bold text-gray-500 hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 py-4 bg-brand-600 text-white rounded-2xl font-bold hover:bg-brand-700 shadow-xl shadow-brand-100 transition-all"
                >
                  {submitting ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {rooms.map((room) => (
          <div
            key={room.id}
            className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/40 overflow-hidden hover:border-brand-200 transition-all group"
          >
            <div className="aspect-video bg-gray-100 relative">
              <div className="absolute top-4 right-4 flex gap-2">
                <button className="p-2 rounded-xl bg-white/90 backdrop-blur shadow-sm text-gray-400 hover:text-brand-600 transition-all">
                  <Edit3 className="h-4 w-4" />
                </button>
                <button className="p-2 rounded-xl bg-white/90 backdrop-blur shadow-sm text-gray-400 hover:text-red-600 transition-all">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="p-8">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-black text-gray-900">{room.name}</h3>
                  <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">
                    {room.type}
                  </div>
                </div>
                <div
                  className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${
                    room.status === 'active'
                      ? 'text-green-600 bg-green-50'
                      : 'text-orange-600 bg-orange-50'
                  }`}
                >
                  {room.status === 'active' ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : (
                    <XCircle className="h-3 w-3" />
                  )}
                  {room.status}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 py-6 border-y border-gray-50 mb-6">
                <div>
                  <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">
                    Capacity
                  </div>
                  <div className="flex items-center gap-2 font-black text-gray-900">
                    <Users className="h-4 w-4 text-gray-300" /> {room.capacity} Guests
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">
                    Size
                  </div>
                  <div className="flex items-center gap-2 font-black text-gray-900">
                    <Maximize2 className="h-4 w-4 text-gray-300" /> 45m²
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div>
                  <div className="text-2xl font-black text-brand-600">${room.price}</div>
                  <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                    Per Night
                  </div>
                </div>
                <button className="px-4 py-2 rounded-xl border border-gray-100 text-xs font-bold text-gray-500 hover:text-brand-600 hover:bg-brand-50 transition-all">
                  Manage Stock
                </button>
              </div>
            </div>
          </div>
        ))}

        <button className="min-h-[400px] rounded-[2.5rem] border-4 border-dashed border-gray-100 flex flex-col items-center justify-center text-gray-300 hover:text-brand-600 hover:border-brand-200 hover:bg-brand-50/30 transition-all group">
          <div className="p-6 rounded-3xl bg-gray-50 group-hover:bg-white transition-all mb-4">
            <Plus className="h-10 w-10" />
          </div>
          <span className="font-black text-xl tracking-tight">Create New Category</span>
        </button>
      </div>
    </div>
  );
}
