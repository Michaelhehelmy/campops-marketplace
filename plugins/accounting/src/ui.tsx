import React from 'react';

/**
 * FinancialHealthWidget
 * ─────────────────────
 * Premium widget showing P&L and cash flow overview.
 */
export function FinancialHealthWidget() {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4 animate-in fade-in zoom-in duration-700">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-gray-900">Financial Health</h4>
        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
          Live Ledger
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <div className="text-2xl font-black text-gray-900">$84,230</div>
          <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 uppercase">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 15l7-7 7 7"
              />
            </svg>
            12% Revenue
          </div>
        </div>
        <div className="space-y-1 text-right">
          <div className="text-2xl font-black text-gray-900">$12,450</div>
          <div className="flex items-center justify-end gap-1 text-[10px] font-bold text-rose-600 uppercase">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M19 9l-7 7-7-7"
              />
            </svg>
            5% Expenses
          </div>
        </div>
      </div>

      <div className="pt-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold text-gray-400 uppercase">
            Cash Flow Projection
          </span>
          <span className="text-[10px] font-bold text-emerald-600">On Track</span>
        </div>
        <div className="flex gap-1 h-8 items-end">
          {[40, 60, 35, 80, 50, 90, 75].map((h, i) => (
            <div
              key={i}
              className="flex-1 bg-brand-50 rounded-t-sm hover:bg-brand-200 transition-colors cursor-pointer group relative"
              style={{ height: `${h}%` }}
            >
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[8px] py-0.5 px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                ${h}k
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export const components = {
  FinancialHealthWidget,
};
