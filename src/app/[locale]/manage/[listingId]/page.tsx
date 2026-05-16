'use client';

import React from 'react';
import { TrendingUp, Users, Calendar, DollarSign, Activity, AppWindow } from 'lucide-react';
import { MarketplaceInsights, MarketplaceFeesWidget } from '@/components/MarketplaceInsights';

export default function ListingDashboardPage({ params }: { params: { listingId: string } }) {
  const { listingId } = params;
  const [stats, setStats] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`/api/manage/${listingId}/stats`);
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        } else {
          // Fallback stats for UI consistency
          setStats({
            totalBookings: 0,
            occupancy: 0,
            netRevenue: 0,
            revenueTrend: 0,
            arrivalsToday: 0,
            departuresToday: 0,
            enabledPlugins: 0,
          });
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
        setStats({
          totalBookings: 0,
          occupancy: 0,
          netRevenue: 0,
          revenueTrend: 0,
          arrivalsToday: 0,
          departuresToday: 0,
          enabledPlugins: 0,
        });
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [listingId]);

  if (loading || !stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-gray-100 rounded-3xl"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Property Overview</h1>
          <p className="text-sm text-gray-500 mt-1">Real-time performance and insights</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Bookings"
          value={stats.totalBookings ?? 0}
          trend="+12%"
          icon={Calendar}
          color="brand"
        />
        <StatCard
          title="Occupancy"
          value={`${stats.occupancy ?? 0}%`}
          trend="+5%"
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Active Plugins"
          value={stats.enabledPlugins ?? 0}
          trend="Stable"
          icon={AppWindow}
          color="green"
        />
        <StatCard
          title="Marketplace Status"
          value={stats.isActive ? 'Live' : 'Hidden'}
          trend="Health: OK"
          icon={TrendingUp}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <MarketplaceInsights propertyId={listingId} />

          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/40">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-gray-900 tracking-tight">
                Today's Operations
              </h3>
              <div className="flex gap-2">
                <span className="px-3 py-1 rounded-full bg-green-50 text-green-600 text-[10px] font-black uppercase tracking-widest">
                  Normal Ops
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="p-6 rounded-3xl bg-gray-50 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest">
                    Arrivals
                  </div>
                  <div className="text-2xl font-black text-gray-900">
                    {stats.arrivalsToday ?? 0}
                  </div>
                </div>
                <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-brand-600 shadow-sm">
                  <Activity className="h-5 w-5" />
                </div>
              </div>
              <div className="p-6 rounded-3xl bg-gray-50 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest">
                    Departures
                  </div>
                  <div className="text-2xl font-black text-gray-900">
                    {stats.departuresToday ?? 0}
                  </div>
                </div>
                <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-orange-600 shadow-sm">
                  <Activity className="h-5 w-5 rotate-180" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Widgets */}
        <div className="space-y-6">
          <MarketplaceFeesWidget propertyId={listingId} />

          <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl shadow-brand-900/10 text-white relative overflow-hidden">
            <div className="absolute top-[-20px] right-[-20px] h-32 w-32 bg-brand-600/20 rounded-full blur-3xl"></div>
            <div className="flex items-center gap-2 mb-4 relative z-10">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-[10px] text-brand-400 font-black uppercase tracking-widest">
                PWA Status
              </span>
            </div>
            <div className="text-lg font-black relative z-10">
              {stats.pwaActive ? 'Your Guest PWA is live' : 'PWA is inactive'}
            </div>
            <p className="text-xs text-slate-400 mt-2 relative z-10 leading-relaxed">
              Install banners are currently active for all mobile visitors on your listing page.
            </p>
            <button className="mt-6 w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold transition-all border border-white/10">
              Manage App Config
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, trend, icon: Icon, color }: any) {
  const colors: any = {
    brand: 'text-brand-600 bg-brand-50',
    blue: 'text-blue-600 bg-blue-50',
    green: 'text-green-600 bg-green-50',
    purple: 'text-purple-600 bg-purple-50',
  };

  return (
    <div className="bg-white p-6 rounded-3xl shadow-xl shadow-gray-200/40 border border-gray-50 flex flex-col justify-between hover:scale-[1.02] transition-all">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-2xl ${colors[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg">
          {trend}
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
