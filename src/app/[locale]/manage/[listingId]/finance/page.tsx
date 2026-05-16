'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  BarChart3,
  DollarSign,
  TrendingUp,
  CreditCard,
  Download,
  ArrowUpRight,
  PieChart,
  HelpCircle,
} from 'lucide-react';

export default function ManagerFinancePage() {
  const params = useParams();
  const router = useRouter();
  const listingId = params.listingId as string;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string>('');

  useEffect(() => {
    fetch(`/api/listing-access?listing=${listingId}`)
      .then((r) => r.json())
      .then((d) => setRole(d.role || 'staff'))
      .catch(() => setRole('staff'));
  }, [listingId]);

  useEffect(() => {
    fetch(`/api/manage/${listingId}/finance`)
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [listingId]);

  if (loading) return <div className="p-8">Loading financial data...</div>;

  if (role === 'staff') {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-black text-gray-900">Unauthorized</h1>
        <p className="mt-4 text-gray-600">Staff members do not have access to financial data.</p>
        <p className="mt-2 text-sm text-gray-400">Redirecting...</p>
      </div>
    );
  }

  if (!data) return <div className="p-8">Error loading data.</div>;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Financial Overview</h1>
          <p className="text-gray-500">Track earnings, marketplace fees, and payouts.</p>
        </div>
        <button className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-200">
          <Download className="h-5 w-5" /> Export Statements
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Revenue"
          value={data.stats.totalRevenue}
          trend={data.stats.trends.revenue}
          color="brand"
        />
        <StatsCard
          title="Net Payouts"
          value={data.stats.netPayouts}
          trend={data.stats.trends.payouts}
          color="blue"
        />
        <StatsCard
          title="Total Commission"
          value={data.stats.commissionFees}
          trend={data.stats.trends.fees}
          color="orange"
        />
        <StatsCard
          title="Avg. Booking"
          value={data.stats.avgBooking}
          trend={data.stats.trends.avg}
          color="green"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/40 p-8">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-black text-gray-900 tracking-tight">Recent Transactions</h3>
            <div className="flex gap-2">
              <button className="px-3 py-1 rounded-full bg-gray-50 text-gray-400 text-[10px] font-black uppercase tracking-widest hover:text-gray-900 transition-all">
                Filter
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {data.transactions.length === 0 ? (
              <div className="text-center py-12 text-gray-400">No transactions found.</div>
            ) : (
              data.transactions.map((pay: any) => (
                <div
                  key={pay.id}
                  className="flex items-center justify-between p-6 rounded-3xl bg-gray-50/50 hover:bg-white hover:shadow-lg hover:shadow-gray-100 transition-all border border-transparent hover:border-gray-100 group"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-white border border-gray-100 flex items-center justify-center text-brand-600 shadow-sm">
                      <CreditCard className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="font-bold text-gray-900 group-hover:text-brand-600 transition-colors">
                        {pay.id.substring(0, 8)}
                      </div>
                      <div className="text-xs text-gray-400">{pay.date}</div>
                    </div>
                  </div>
                  <div className="flex gap-12 text-right">
                    <div className="hidden sm:block">
                      <div className="text-xs text-gray-400 font-bold uppercase tracking-widest">
                        Gross
                      </div>
                      <div className="font-bold text-gray-600">${pay.amount.toFixed(2)}</div>
                    </div>
                    <div className="hidden sm:block">
                      <div className="text-xs text-gray-400 font-bold uppercase tracking-widest text-red-400">
                        Fee
                      </div>
                      <div className="font-bold text-red-400">-${pay.fee.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-brand-600 font-bold uppercase tracking-widest">
                        Net
                      </div>
                      <div className="font-black text-gray-900">${pay.net.toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <button className="w-full mt-8 py-4 text-xs font-black uppercase tracking-[0.2em] text-gray-400 hover:text-brand-600 transition-all border-2 border-dashed border-gray-100 rounded-2xl hover:border-brand-200">
            View Full Transaction History
          </button>
        </div>

        <div className="space-y-6">
          <div className="bg-brand-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-brand-100 relative overflow-hidden">
            <PieChart className="absolute top-[-20px] right-[-20px] h-32 w-32 text-white/10 rotate-12" />
            <div className="relative z-10">
              <h3 className="text-lg font-black mb-1">Commission Breakdown</h3>
              <p className="text-xs text-white/70 mb-6">Marketplace commission structure</p>
              <div className="space-y-4">
                <FeeItem label="Current Rate" value={data.commissionRate} />
                <FeeItem label="Platform Service" value="Included" />
                <div className="pt-4 border-t border-white/20">
                  <FeeItem label="Total Applied" value={data.commissionRate} bold />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/40">
            <div className="flex items-center gap-2 mb-4">
              <HelpCircle className="h-5 w-5 text-gray-400" />
              <h3 className="text-lg font-black text-gray-900">Need Help?</h3>
            </div>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              Questions about your payout? Our finance team is available 24/7.
            </p>
            <button className="w-full py-3 bg-gray-50 hover:bg-gray-100 rounded-xl text-sm font-bold text-gray-900 transition-all">
              Contact Support
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatsCard({ title, value, trend, color }: any) {
  const colors: any = {
    brand: 'text-brand-600 bg-brand-50',
    blue: 'text-blue-600 bg-blue-50',
    orange: 'text-orange-600 bg-orange-50',
    green: 'text-green-600 bg-green-50',
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-gray-50 shadow-sm flex flex-col justify-between hover:scale-[1.02] transition-all">
      <div className="flex justify-between items-center mb-4">
        <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">
          {title}
        </div>
        <div
          className={`px-2 py-1 rounded-lg text-[10px] font-black ${trend.startsWith('+') ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}
        >
          {trend}
        </div>
      </div>
      <div className={`text-2xl font-black ${colors[color].split(' ')[0]}`}>{value}</div>
    </div>
  );
}

function FeeItem({ label, value, bold }: any) {
  return (
    <div className="flex justify-between items-center">
      <span className={`text-xs ${bold ? 'font-black' : 'font-medium opacity-80'}`}>{label}</span>
      <span className={`text-sm ${bold ? 'font-black' : 'font-bold'}`}>{value}</span>
    </div>
  );
}
