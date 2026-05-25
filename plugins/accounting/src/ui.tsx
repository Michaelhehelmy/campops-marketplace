import React, { useState, useEffect } from 'react';

export function FinancialHealthWidget() {
  const [summary, setSummary] = useState<{ revenue: number; expenses: number; net: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/p/accounting/summary?period=month')
      .then((res) => res.json())
      .then((data) => setSummary(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4 animate-in fade-in zoom-in duration-700">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-gray-900">Financial Health</h4>
        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Live Ledger</div>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400">Loading...</div>
      ) : summary ? (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="text-2xl font-black text-gray-900">${summary.revenue.toLocaleString()}</div>
              <div className="text-[10px] font-bold text-emerald-600 uppercase">Revenue (30d)</div>
            </div>
            <div className="space-y-1 text-right">
              <div className="text-2xl font-black text-gray-900">${summary.expenses.toLocaleString()}</div>
              <div className="text-[10px] font-bold text-rose-600 uppercase">Expenses (30d)</div>
            </div>
          </div>

          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Net Position</span>
              <span className={`text-[10px] font-bold ${summary.net >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {summary.net >= 0 ? 'Profitable' : 'Loss'}
              </span>
            </div>
            <div className="text-lg font-black text-gray-900">
              ${summary.net >= 0 ? '' : '-'}${Math.abs(summary.net).toLocaleString()}
            </div>
          </div>
        </>
      ) : (
        <div className="text-sm text-gray-400">No data available</div>
      )}
    </div>
  );
}

export const components = {
  FinancialHealthWidget,
};
