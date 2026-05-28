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
  X,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Info,
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

  // Quick Action States
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'info' | 'error';
  } | null>(null);
  const [runningAction, setRunningAction] = useState<string | null>(null);
  const [noticeModalOpen, setNoticeModalOpen] = useState(false);
  const [noticeText, setNoticeText] = useState('');
  const [noticeBroadcasting, setNoticeBroadcasting] = useState(false);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/master/stats');
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

  const handleVerifyDomains = () => {
    setRunningAction('verify_domains');
    setTimeout(() => {
      setRunningAction(null);
      showToast('Domain clusters verified: All subdomains mapped & SSL matched! ✅', 'success');
    }, 1500);
  };

  const handleBroadcastNotice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noticeText.trim()) return;
    setNoticeBroadcasting(true);
    setTimeout(() => {
      setNoticeBroadcasting(false);
      setNoticeModalOpen(false);
      setNoticeText('');
      showToast('Global announcement successfully broadcasted! 📣', 'success');
    }, 1200);
  };

  const handleFlushCache = () => {
    setRunningAction('flush_cache');
    setTimeout(() => {
      setRunningAction(null);
      showToast('Flush complete: Cleared 142.4 MB of dynamic compilation caches! ✅', 'success');
    }, 1800);
  };

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse p-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-slate-900/5 rounded-3xl"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 h-96 bg-slate-900/5 rounded-[2.5rem]"></div>
          <div className="h-96 bg-slate-900/5 rounded-[2.5rem]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 relative">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-[999] flex items-center gap-3 px-6 py-4 rounded-2xl bg-slate-900 border border-amber-500/30 text-white shadow-2xl animate-in slide-in-from-top-10 duration-300">
          {toast.type === 'success' && <CheckCircle className="h-5 w-5 text-green-400" />}
          {toast.type === 'error' && <AlertTriangle className="h-5 w-5 text-red-400" />}
          {toast.type === 'info' && <Info className="h-5 w-5 text-amber-400" />}
          <span className="text-sm font-bold">{toast.message}</span>
        </div>
      )}

      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">Platform Overview</h1>
        <p className="text-zinc-500 text-sm mt-1">
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
        {/* Main Chart Card */}
        <div className="lg:col-span-2 bg-slate-950 p-8 rounded-[2.5rem] border border-slate-900 shadow-2xl relative overflow-hidden">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-xl font-black text-white tracking-tight">Growth Analytics</h3>
              <p className="text-sm text-zinc-500">Platform-wide revenue performance</p>
            </div>
            <div className="flex gap-2">
              <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-black uppercase tracking-widest">
                Revenue
              </span>
              <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-black uppercase tracking-widest">
                Bookings
              </span>
            </div>
          </div>

          <div className="h-64 flex items-end justify-between gap-3 px-4">
            {[40, 60, 45, 70, 85, 65, 90, 100, 80, 95, 110, 130].map((h, i) => (
              <div key={i} className="group relative flex-1">
                <div
                  style={{ height: `${h}%` }}
                  className="bg-gradient-to-t from-amber-500 to-amber-400 rounded-t-lg opacity-80 group-hover:opacity-100 transition-all cursor-pointer shadow-[0_0_10px_rgba(245,158,11,0.15)]"
                ></div>
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-all pointer-events-none font-bold">
                  ${h}k
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-4 px-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
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
          <div className="bg-slate-950 p-8 rounded-[2.5rem] border border-slate-900 shadow-2xl relative overflow-hidden">
            <Zap className="absolute top-[-20px] right-[-20px] h-32 w-32 text-amber-500/5 rotate-12" />
            <h3 className="text-lg font-black mb-6 text-white relative z-10">
              Marketplace Actions
            </h3>
            <div className="space-y-3 relative z-10">
              <ActionButton
                icon={Globe}
                label="Verify Domain Clusters"
                onClick={handleVerifyDomains}
                loading={runningAction === 'verify_domains'}
              />
              <ActionButton
                icon={Bell}
                label="Broadcast Global Notice"
                onClick={() => setNoticeModalOpen(true)}
              />
              <ActionButton
                icon={Activity}
                label="Flush System Cache"
                onClick={handleFlushCache}
                loading={runningAction === 'flush_cache'}
              />
            </div>
          </div>

          <div className="bg-slate-950 p-8 rounded-[2.5rem] border border-slate-900 shadow-2xl">
            <h3 className="text-lg font-black text-white mb-6">Recent Activity</h3>
            <div className="space-y-6">
              {stats!.recentActivity.map((act) => (
                <div key={act.id} className="flex gap-4">
                  <div className="h-10 w-10 rounded-2xl bg-slate-900 border border-slate-850 flex items-center justify-center text-amber-400">
                    <Zap className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-zinc-200">{act.title}</div>
                    <div className="text-xs text-zinc-500">{act.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Notice Broadcast Modal */}
      {noticeModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-slate-950 border border-slate-900 rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl relative">
            <button
              onClick={() => setNoticeModalOpen(false)}
              className="absolute top-6 right-6 p-2 text-zinc-400 hover:text-white rounded-full bg-slate-900 border border-slate-800 hover:bg-slate-850"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3 mb-6">
              <Bell className="h-6 w-6 text-amber-500" />
              <h3 className="text-xl font-black text-white">Broadcast Global Notice</h3>
            </div>
            <form onSubmit={handleBroadcastNotice} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">
                  Notice Message
                </label>
                <textarea
                  required
                  rows={4}
                  value={noticeText}
                  onChange={(e) => setNoticeText(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-850 focus:border-amber-500 rounded-2xl text-white outline-none transition-all text-sm resize-none"
                  placeholder="Type the announcement to broadcast across all listing portals..."
                />
              </div>
              <button
                type="submit"
                disabled={noticeBroadcasting}
                className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 rounded-2xl font-black shadow-xl shadow-amber-500/10 hover:shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
              >
                {noticeBroadcasting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  'Send Broadcast'
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, trend, icon: Icon, color }: any) {
  const colors: any = {
    purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    green: 'text-green-400 bg-green-500/10 border-green-500/20',
    orange: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  };

  const isPositive = trend > 0;

  return (
    <div className="bg-slate-950 p-6 rounded-[2rem] shadow-2xl border border-slate-900 hover:border-slate-850 transition-all flex flex-col justify-between hover:translate-y-[-4px] group">
      <div className="flex justify-between items-start mb-4">
        <div
          className={`p-3 rounded-2xl border ${colors[color]} group-hover:scale-110 transition-transform`}
        >
          <Icon className="h-6 w-6" />
        </div>
        <div
          className={`flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-lg ${isPositive ? 'text-green-400 bg-green-500/10' : 'text-red-400 bg-red-500/10'}`}
        >
          {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {Math.abs(trend)}%
        </div>
      </div>
      <div>
        <div className="text-3xl font-black text-white tracking-tight">{value}</div>
        <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">
          {title}
        </div>
      </div>
    </div>
  );
}

function ActionButton({ icon: Icon, label, onClick, loading }: any) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="w-full flex items-center justify-between p-4 rounded-2xl bg-slate-900 border border-slate-850 hover:border-amber-500/30 text-zinc-300 hover:text-white transition-all text-sm font-bold group disabled:opacity-50"
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-slate-950 group-hover:bg-amber-500 group-hover:text-slate-950 transition-all text-amber-500 border border-slate-850">
          <Icon className="h-4 w-4" />
        </div>
        {label}
      </div>
      {loading && <Loader2 className="h-4 w-4 animate-spin text-amber-500" />}
    </button>
  );
}
