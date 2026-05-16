'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  Brush,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronRight,
  Home,
} from 'lucide-react';

export default function HousekeepingPage() {
  const params = useParams();
  const { listingId } = params;

  const [rooms, setRooms] = useState<any[]>([
    { id: '101', type: 'Cabin', status: 'dirty', staff: 'None', priority: 'high' },
    { id: '102', type: 'Cabin', status: 'clean', staff: 'Alice', priority: 'low' },
  ]);
  const [loading, setLoading] = useState(false);

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-10 w-64 bg-gray-100 rounded-xl mb-4"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-gray-100 rounded-3xl"></div>
          ))}
        </div>
        <div className="h-96 bg-gray-100 rounded-[2.5rem]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            Housekeeping Schedule
          </h1>
          <p className="text-gray-500">Monitor room status and assign cleaning tasks.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 bg-brand-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-brand-700 transition-all shadow-xl shadow-brand-100">
            Assign Tasks
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatsTile label="Total Rooms" value="24" color="gray" />
        <StatsTile label="Dirty" value="8" color="red" />
        <StatsTile label="Cleaning" value="3" color="orange" />
        <StatsTile label="Ready" value="13" color="green" />
      </div>

      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/40 overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex items-center justify-between">
          <div className="text-lg font-black text-gray-900">Room Status</div>
          <div className="flex gap-2">
            <button className="p-3 rounded-xl border border-gray-100 text-gray-400 hover:text-gray-900 transition-all">
              <Filter className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 p-8">
          {rooms.map((room) => (
            <div
              key={room.id}
              className="p-6 rounded-[2rem] border border-gray-100 hover:border-brand-200 transition-all group relative overflow-hidden"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`h-12 w-12 rounded-2xl flex items-center justify-center ${room.status === 'clean' ? 'bg-green-50 text-green-600' : room.status === 'cleaning' ? 'bg-orange-50 text-orange-600' : 'bg-red-50 text-red-600'}`}
                  >
                    <Home className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="text-xl font-black text-gray-900">Room {room.id}</div>
                    <div className="text-xs text-gray-400 font-bold uppercase tracking-widest">
                      {room.type}
                    </div>
                  </div>
                </div>
                <div
                  className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest ${room.priority === 'high' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-500'}`}
                >
                  {room.priority} Priority
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400 font-bold">Status</span>
                  <span
                    className={`font-black uppercase tracking-widest text-[10px] ${room.status === 'clean' ? 'text-green-600' : room.status === 'cleaning' ? 'text-orange-600' : 'text-red-600'}`}
                  >
                    {room.status}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400 font-bold">Staff</span>
                  <span className="text-gray-900 font-bold">{room.staff}</span>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-50 flex gap-2">
                <button className="flex-1 py-2 rounded-xl bg-gray-50 text-gray-900 text-xs font-bold hover:bg-brand-600 hover:text-white transition-all">
                  Update Status
                </button>
                <button className="p-2 rounded-xl bg-gray-50 text-gray-400 hover:text-gray-900">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatsTile({ label, value, color }: any) {
  const colors: any = {
    red: 'text-red-600 bg-red-50',
    orange: 'text-orange-600 bg-orange-50',
    green: 'text-green-600 bg-green-50',
    gray: 'text-gray-600 bg-gray-50',
  };

  return (
    <div
      className={`p-6 rounded-3xl border border-gray-100 shadow-sm text-center ${colors[color]}`}
    >
      <div className="text-3xl font-black">{value}</div>
      <div className="text-[10px] font-bold uppercase tracking-widest mt-1 opacity-70">{label}</div>
    </div>
  );
}
