import React, { useState, useEffect } from 'react';

export function RecurringRevenueWidget() {
  const [revenue, setRevenue] = useState<{ mrr: number; activeSubscriptions: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/p/subscriptions?section=revenue')
      .then((res) => res.json())
      .then((data) => setRevenue(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-gray-900">MRR Overview</h4>
        <div className="bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
          {loading ? '...' : `${revenue?.activeSubscriptions || 0} Active`}
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400">Loading...</div>
      ) : revenue ? (
        <>
          <div className="flex flex-col gap-1">
            <div className="text-3xl font-black text-gray-900">${revenue.mrr.toLocaleString()}</div>
            <div className="text-xs text-gray-400 font-bold uppercase tracking-widest">Monthly Recurring Revenue</div>
          </div>

          <div className="pt-2 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 font-medium">Active Subscriptions</span>
              <span className="text-xs font-bold text-gray-900">{revenue.activeSubscriptions}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 font-medium">Avg. Revenue/Sub</span>
              <span className="text-xs font-bold text-gray-900">
                ${revenue.activeSubscriptions > 0 ? (revenue.mrr / revenue.activeSubscriptions).toFixed(2) : '0.00'}
              </span>
            </div>
          </div>
        </>
      ) : (
        <div className="text-sm text-gray-400">No subscription data yet.</div>
      )}
    </div>
  );
}

export const components = {
  RecurringRevenueWidget,
};
