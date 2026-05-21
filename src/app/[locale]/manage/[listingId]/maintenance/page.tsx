'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Wrench,
  Search,
  Filter,
  Plus,
  AlertCircle,
  Clock,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';

export default function MaintenancePage() {
  const params = useParams();
  const { listingId } = params;

  const [tickets, setTickets] = useState<any[]>([
    {
      id: 'TKT-1',
      title: 'Leaky Faucet',
      location: 'Cabin 101',
      priority: 'critical',
      status: 'pending',
      time: '2h ago',
    },
    {
      id: 'TKT-2',
      title: 'Broken Light',
      location: 'General Area',
      priority: 'low',
      status: 'completed',
      time: '1d ago',
    },
  ]);
  const [loading, setLoading] = useState(false);

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-10 w-64 bg-gray-100 rounded-xl mb-4"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
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
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Maintenance Tasks</h1>
          <p className="text-gray-500">Track and manage facility work orders.</p>
        </div>
        <button className="flex items-center gap-2 bg-brand-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-brand-700 transition-all shadow-xl shadow-brand-100">
          <Plus className="h-5 w-5" /> New Ticket
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-red-50 p-6 rounded-3xl border border-red-100 flex items-center gap-6">
          <div className="p-4 rounded-2xl bg-red-600 text-white shadow-lg shadow-red-200">
            <AlertCircle className="h-8 w-8" />
          </div>
          <div>
            <div className="text-3xl font-black text-red-600">2</div>
            <div className="text-[10px] text-red-600 font-bold uppercase tracking-widest">
              Critical Tasks
            </div>
          </div>
        </div>
        <div className="bg-orange-50 p-6 rounded-3xl border border-orange-100 flex items-center gap-6">
          <div className="p-4 rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-200">
            <Clock className="h-8 w-8" />
          </div>
          <div>
            <div className="text-3xl font-black text-orange-600">5</div>
            <div className="text-[10px] text-orange-600 font-bold uppercase tracking-widest">
              In Progress
            </div>
          </div>
        </div>
        <div className="bg-green-50 p-6 rounded-3xl border border-green-100 flex items-center gap-6">
          <div className="p-4 rounded-2xl bg-green-500 text-white shadow-lg shadow-green-200">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <div>
            <div className="text-3xl font-black text-green-600">14</div>
            <div className="text-[10px] text-green-600 font-bold uppercase tracking-widest">
              Completed (Month)
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/40 overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex items-center justify-between">
          <div className="relative w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search tickets..."
              className="w-full pl-12 pr-4 py-3 rounded-2xl border border-gray-100 focus:border-brand-200 focus:ring-4 focus:ring-brand-50 transition-all outline-none text-sm"
            />
          </div>
          <button className="p-3 rounded-xl border border-gray-100 text-gray-400 hover:text-gray-900 transition-all">
            <Filter className="h-5 w-5" />
          </button>
        </div>

        <div className="divide-y divide-gray-50">
          {tickets.map((t) => (
            <div
              key={t.id}
              className="p-8 hover:bg-gray-50/50 transition-all group flex items-center justify-between"
            >
              <div className="flex items-center gap-6">
                <div
                  className={`h-14 w-14 rounded-2xl flex items-center justify-center ${t.priority === 'critical' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-400'}`}
                >
                  <Wrench className="h-7 w-7" />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-900 text-lg">{t.title}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${t.priority === 'critical' ? 'bg-red-600 text-white' : t.priority === 'high' ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'}`}
                    >
                      {t.priority}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">
                      {t.id}
                    </span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-500 font-medium">{t.location}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-12">
                <div className="text-right">
                  <div
                    className={`text-[10px] font-black uppercase tracking-widest ${t.status === 'completed' ? 'text-green-600' : 'text-orange-600'}`}
                  >
                    {t.status.replace('_', ' ')}
                  </div>
                  <div className="text-xs text-gray-400">{t.time}</div>
                </div>
                <button className="p-3 rounded-2xl bg-gray-50 text-gray-400 group-hover:bg-brand-600 group-hover:text-white transition-all">
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
