import React from 'react';

/**
 * RecurringRevenueWidget
 * ──────────────────────
 * Overview of subscription health and MRR.
 */
export function RecurringRevenueWidget() {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-gray-900">MRR Overview</h4>
        <div className="bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
          +4.2% Growth
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <div className="text-3xl font-black text-gray-900">$24,500</div>
        <div className="text-xs text-gray-400 font-bold uppercase tracking-widest">
          Monthly Recurring Revenue
        </div>
      </div>

      <div className="pt-2 space-y-2">
        <div className="flex items-center justify-between group cursor-help">
          <span className="text-xs text-gray-500 font-medium">Seasonal Pitches</span>
          <span className="text-xs font-bold text-gray-900">142 Active</span>
        </div>
        <div className="flex items-center justify-between group cursor-help">
          <span className="text-xs text-gray-500 font-medium">Club Memberships</span>
          <span className="text-xs font-bold text-gray-900">850 Active</span>
        </div>
        <div className="flex items-center justify-between group cursor-help text-rose-600">
          <span className="text-xs font-medium">Churn (MTD)</span>
          <span className="text-xs font-bold">1.2%</span>
        </div>
      </div>
    </div>
  );
}

export const components = {
  RecurringRevenueWidget,
};
