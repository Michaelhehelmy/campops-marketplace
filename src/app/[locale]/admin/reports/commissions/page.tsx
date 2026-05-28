'use client';

import { useState, useEffect } from 'react';
import {
  BarChart3,
  DollarSign,
  ArrowUpRight,
  TrendingUp,
  Download,
  Calendar,
  Filter,
  Search,
} from 'lucide-react';

export default function MasterCommissionsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/master/commissions')
      .then((res) => res.json())
      .then((data) => {
        setReports(data.reports || []);
        setStats(data.stats);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch commissions:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-400 font-bold animate-pulse">
        Loading commissions...
      </div>
    );
  }

  return (
    <div className="space-y-8 ">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Commission Reports</h2>
          <p className="text-gray-500">Track platform revenue and per-listing marketplace fees.</p>
        </div>
        <button className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-200">
          <Download className="h-5 w-5" /> Export CSV
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <RevenueCard
          title="Total Fees Collected"
          value={`$${stats?.totalFees.toLocaleString() || '0'}`}
          trend="+15.2%"
          color="purple"
        />
        <RevenueCard
          title="Pending Payouts"
          value={`$${stats?.pendingPayouts.toLocaleString() || '0'}`}
          trend="-2.4%"
          color="blue"
        />
        <RevenueCard
          title="Average Commission"
          value={`${stats?.avgCommission.toFixed(1) || '10.0'}%`}
          trend="+0.5%"
          color="green"
        />
      </div>

      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/40 overflow-hidden">
        <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
          <div className="flex gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Filter by shop..."
                className="pl-10 pr-4 py-2 rounded-xl border border-gray-100 text-sm outline-none focus:border-purple-200"
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-100 bg-white text-xs font-bold text-gray-500 hover:text-gray-900 transition-all">
              <Calendar className="h-4 w-4" /> This Month
            </button>
          </div>
          <div className="flex gap-2">
            <button className="p-2 rounded-lg hover:bg-white transition-all text-gray-400 hover:text-gray-900">
              <Filter className="h-5 w-5" />
            </button>
          </div>
        </div>

        <table className="w-full text-left">
          <thead>
            <tr>
              <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
                Shop Name
              </th>
              <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
                Booking Volume
              </th>
              <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
                Commission Rate
              </th>
              <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
                Net Fee
              </th>
              <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
                Status
              </th>
              <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {reports.map((report) => (
              <tr key={report.id} className="hover:bg-gray-50/50 transition-all group">
                <td className="px-8 py-6">
                  <div className="font-bold text-gray-900">{report.shop}</div>
                  <div className="text-xs text-gray-400">Monthly breakdown</div>
                </td>
                <td className="px-8 py-6">
                  <div className="font-bold text-gray-900">${report.volume.toLocaleString()}</div>
                </td>
                <td className="px-8 py-6">
                  <div className="text-sm font-bold text-gray-600">{report.rate}</div>
                </td>
                <td className="px-8 py-6">
                  <div className="text-lg font-black text-purple-600">
                    ${report.commission.toLocaleString()}
                  </div>
                </td>
                <td className="px-8 py-6">
                  <span
                    className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                      report.status === 'paid'
                        ? 'bg-green-100 text-green-600'
                        : report.status === 'pending'
                          ? 'bg-orange-100 text-orange-600'
                          : 'bg-blue-100 text-blue-600'
                    }`}
                  >
                    {report.status}
                  </span>
                </td>
                <td className="px-8 py-6 text-right">
                  <button className="text-xs font-bold text-purple-600 hover:underline">
                    View Ledger
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RevenueCard({ title, value, trend, color }: any) {
  const colors: any = {
    purple: 'from-purple-600 to-purple-400',
    blue: 'from-blue-600 to-blue-400',
    green: 'from-green-600 to-green-400',
  };

  return (
    <div
      className={`bg-gradient-to-br ${colors[color]} p-8 rounded-[2.5rem] text-white shadow-xl shadow-gray-200 relative overflow-hidden group`}
    >
      <DollarSign className="absolute top-[-20px] right-[-20px] h-32 w-32 text-white/10 rotate-12 group-hover:rotate-[20deg] transition-all" />
      <div className="relative z-10">
        <div className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">
          {title}
        </div>
        <div className="text-3xl font-black mb-4">{value}</div>
        <div className="flex items-center gap-1.5 bg-white/20 w-fit px-2 py-1 rounded-lg text-xs font-bold backdrop-blur-md">
          <ArrowUpRight className="h-3 w-3" /> {trend}
        </div>
      </div>
    </div>
  );
}
