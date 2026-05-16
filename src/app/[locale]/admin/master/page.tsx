'use client';

import { useEffect, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Store,
  DollarSign,
  Activity,
  Zap,
  Globe,
  Bell,
} from 'lucide-react';

interface Stats {
  totalListings: number;
  activeListings: number;
  totalRevenue: number;
  revenueTrend: number;
  activeGuests: number;
  guestTrend: number;
  systemHealth: number;
  recentActivity: any[];
}

export default function MasterOverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/master/stats?adminId=master-admin');
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-gray-100 rounded-3xl"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 h-96 bg-gray-100 rounded-3xl"></div>
          <div className="h-96 bg-gray-100 rounded-3xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Platform Overview</h1>
        <p className="text-gray-500 text-sm mt-1">
          Global marketplace performance and system status.
        </p>
      </div>
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Global Revenue"
          value={`$${(stats!.totalRevenue / 100).toLocaleString()}`}
          trend={stats!.revenueTrend}
          icon={DollarSign}
          color="purple"
        />
        <StatCard
          title="Total Listings"
          value={stats!.totalListings}
          trend={4.2}
          icon={Store}
          color="blue"
        />
        <StatCard
          title="Live Guests"
          value={stats!.activeGuests}
          trend={stats!.guestTrend}
          icon={Users}
          color="green"
        />
        <StatCard
          title="System Health"
          value={`${stats!.systemHealth}%`}
          trend={0.1}
          icon={Activity}
          color="orange"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart Placeholder */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/40 relative overflow-hidden">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-xl font-black text-gray-900 tracking-tight">Growth Analytics</h3>
              <p className="text-sm text-gray-500">Platform-wide revenue performance</p>
            </div>
            <div className="flex gap-2">
              <span className="px-3 py-1 rounded-full bg-purple-50 text-purple-600 text-[10px] font-black uppercase tracking-widest">
                Revenue
              </span>
              <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest">
                Bookings
              </span>
            </div>
          </div>

          <div className="h-64 flex items-end justify-between gap-2 px-4">
            {[40, 60, 45, 70, 85, 65, 90, 100, 80, 95, 110, 130].map((h, i) => (
              <div key={i} className="group relative flex-1">
                <div
                  style={{ height: `${h}%` }}
                  className="bg-gradient-to-t from-purple-600 to-purple-400 rounded-t-xl opacity-80 group-hover:opacity-100 transition-all cursor-pointer"
                ></div>
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-all pointer-events-none font-bold">
                  ${h}k
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-4 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
            <span>Jan</span>
            <span>Mar</span>
            <span>May</span>
            <span>Jul</span>
            <span>Sep</span>
            <span>Nov</span>
          </div>
        </div>

        {/* Sidebar Cards */}
        <div className="space-y-6">
          <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-2xl shadow-purple-900/20 relative overflow-hidden">
            <Zap className="absolute top-[-20px] right-[-20px] h-32 w-32 text-purple-500/10 rotate-12" />
            <h3 className="text-lg font-black mb-4 relative z-10">Marketplace Actions</h3>
            <div className="space-y-3 relative z-10">
              <ActionButton icon={Globe} label="Verify Domain Clusters" />
              <ActionButton icon={Bell} label="Broadcast Global Notice" />
              <ActionButton icon={Activity} label="Flush System Cache" />
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/40">
            <h3 className="text-lg font-black text-gray-900 mb-6">Recent Activity</h3>
            <div className="space-y-6">
              {stats!.recentActivity.map((act) => (
                <div key={act.id} className="flex gap-4">
                  <div className="h-10 w-10 rounded-2xl bg-gray-50 flex items-center justify-center text-purple-600">
                    <Zap className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-900">{act.title}</div>
                    <div className="text-xs text-gray-400">{act.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, trend, icon: Icon, color }: any) {
  const colors: any = {
    purple: 'text-purple-600 bg-purple-50',
    blue: 'text-blue-600 bg-blue-50',
    green: 'text-green-600 bg-green-50',
    orange: 'text-orange-600 bg-orange-50',
  };

  const isPositive = trend > 0;

  return (
    <div className="bg-white p-6 rounded-[2rem] shadow-xl shadow-gray-200/40 border border-gray-50 flex flex-col justify-between hover:translate-y-[-4px] transition-all group">
      <div className="flex justify-between items-start mb-4">
        <div
          className={`p-3 rounded-2xl ${colors[color]} group-hover:scale-110 transition-transform`}
        >
          <Icon className="h-6 w-6" />
        </div>
        <div
          className={`flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-lg ${isPositive ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}
        >
          {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {Math.abs(trend)}%
        </div>
      </div>
      <div>
        <div className="text-3xl font-black text-gray-900 tracking-tight">{value}</div>
        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
          {title}
        </div>
      </div>
    </div>
  );
}

function ActionButton({ icon: Icon, label }: any) {
  return (
    <button className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all text-sm font-bold group">
      <div className="p-2 rounded-lg bg-white/5 group-hover:bg-purple-600 transition-all">
        <Icon className="h-4 w-4" />
      </div>
      {label}
    </button>
  );
}
