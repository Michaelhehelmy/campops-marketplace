'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, Users, Store, DollarSign, Activity, Zap, Globe, Bell } from 'lucide-react';

export default function AdminPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/master/stats?adminId=master-admin')
      .then((res) => res.json())
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch stats:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-8 animate-pulse">
        <div className="h-10 w-64 bg-gray-100 rounded-xl mb-4"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-gray-100 rounded-3xl"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return <div className="p-8">Error loading stats.</div>;

  return (
    <div className="space-y-8 p-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Platform Overview</h1>
        <p className="text-gray-500 text-sm mt-1">
          Global marketplace performance and system status.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Global Revenue"
          value={`$${(stats.totalRevenue || 128420).toLocaleString()}`}
          trend={12.5}
          icon={DollarSign}
          color="purple"
        />
        <StatCard
          title="Total Listings"
          value={stats.totalListings || 0}
          trend={4.2}
          icon={Store}
          color="blue"
        />
        <StatCard
          title="Live Guests"
          value={stats.totalBookings || 0}
          trend={5.2}
          icon={Users}
          color="green"
        />
        <StatCard title="System Health" value="99.9%" trend={0.1} icon={Activity} color="orange" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/40">
          <h3 className="text-xl font-black text-gray-900 tracking-tight mb-8">Growth Analytics</h3>
          <div className="h-64 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 italic">
            Platform Growth Chart
          </div>
        </div>
        <div className="space-y-6">
          <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-2xl">
            <h3 className="text-lg font-black mb-4">Marketplace Actions</h3>
            <div className="space-y-3">
              <ActionButton icon={Globe} label="Verify Domain Clusters" />
              <ActionButton icon={Bell} label="Broadcast Global Notice" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }: any) {
  const colors: any = {
    purple: 'text-purple-600 bg-purple-50',
    blue: 'text-blue-600 bg-blue-50',
    green: 'text-green-600 bg-green-50',
    orange: 'text-orange-600 bg-orange-50',
  };
  return (
    <div className="bg-white p-6 rounded-[2rem] shadow-xl shadow-gray-200/40 border border-gray-50">
      <div className={`p-3 rounded-2xl ${colors[color]} w-fit mb-4`}>
        <Icon className="h-6 w-6" />
      </div>
      <div className="text-3xl font-black text-gray-900 tracking-tight">{value}</div>
      <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
        {title}
      </div>
    </div>
  );
}

function ActionButton({ icon: Icon, label }: any) {
  return (
    <button className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all text-sm font-bold">
      <Icon className="h-4 w-4" /> {label}
    </button>
  );
}
