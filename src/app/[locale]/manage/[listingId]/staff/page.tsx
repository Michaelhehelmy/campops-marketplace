'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Users, Search, Plus, Mail, Phone, MoreHorizontal, BadgeCheck, Clock } from 'lucide-react';

export default function StaffPage() {
  const params = useParams();
  const { listingId } = params;

  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const response = await fetch(`/api/manage/${listingId}/staff`);
        if (response.ok) {
          const data = await response.json();
          setStaff(data);
        }
      } catch (error) {
        console.error('Failed to fetch staff:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStaff();
  }, [listingId]);

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-10 w-64 bg-gray-100 rounded-xl mb-4"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-gray-100 rounded-3xl"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 bg-gray-100 rounded-[2.5rem]"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Staff Roster</h2>
          <p className="text-gray-500">Manage property staff, roles, and shift status.</p>
        </div>
        <button className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-200">
          <Plus className="h-5 w-5" /> Add Staff Member
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatsCard title="Total Staff" value="12" icon={Users} color="slate" />
        <StatsCard title="Currently On Duty" value="4" icon={BadgeCheck} color="green" />
        <StatsCard title="Open Shifts" value="2" icon={Clock} color="orange" />
        <StatsCard title="Pending Invites" value="1" icon={Mail} color="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {staff.map((member) => (
          <div
            key={member.id}
            className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/40 hover:border-brand-200 transition-all group"
          >
            <div className="flex justify-between items-start mb-6">
              <div className="h-16 w-16 rounded-3xl bg-gray-50 border border-gray-100 flex items-center justify-center text-slate-400 group-hover:bg-brand-50 group-hover:text-brand-600 transition-all">
                <Users className="h-8 w-8" />
              </div>
              <div
                className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${member.status === 'on_duty' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}
              >
                {member.status.replace('_', ' ')}
              </div>
            </div>

            <h3 className="text-xl font-black text-gray-900 mb-1">{member.name}</h3>
            <div className="text-xs text-brand-600 font-bold uppercase tracking-widest mb-6">
              {member.role}
            </div>

            <div className="space-y-3 mb-8">
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <Mail className="h-4 w-4" /> {member.email}
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <Phone className="h-4 w-4" /> {member.phone}
              </div>
            </div>

            <div className="flex gap-2 pt-6 border-t border-gray-50">
              <button className="flex-1 py-2 rounded-xl bg-gray-50 text-gray-900 text-xs font-bold hover:bg-slate-900 hover:text-white transition-all">
                Edit Profile
              </button>
              <button className="p-2 rounded-xl bg-gray-50 text-gray-400 hover:text-gray-900">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatsCard({ title, value, icon: Icon, color }: any) {
  const colors: any = {
    slate: 'text-slate-600 bg-slate-50',
    green: 'text-green-600 bg-green-50',
    orange: 'text-orange-600 bg-orange-50',
    blue: 'text-blue-600 bg-blue-50',
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
      <div className={`p-3 rounded-2xl ${colors[color]} w-fit mb-4`}>
        <Icon className="h-6 w-6" />
      </div>
      <div className="text-2xl font-black text-gray-900 tracking-tight">{value}</div>
      <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
        {title}
      </div>
    </div>
  );
}
