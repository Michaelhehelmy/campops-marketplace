import React from 'react';

/**
 * CampaignPerformanceWidget
 * ─────────────────────────
 * Real-time stats on active marketing campaigns.
 */
export function CampaignPerformanceWidget() {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-gray-900">Active Campaigns</h4>
        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
          Global Reach
        </div>
      </div>

      <div className="space-y-4">
        {[
          { name: 'Summer Early Bird', reach: 4500, conversion: '8.2%', color: 'bg-indigo-600' },
          { name: 'Autumn Flash Sale', reach: 1200, conversion: '4.5%', color: 'bg-orange-500' },
        ].map((c) => (
          <div key={c.name} className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-gray-700">{c.name}</span>
              <span className="text-xs font-black text-gray-900">{c.conversion}</span>
            </div>
            <div className="w-full bg-gray-50 h-2 rounded-full overflow-hidden border border-gray-100">
              <div
                className={`${c.color} h-full rounded-full transition-all duration-1000`}
                style={{ width: c.conversion }}
              />
            </div>
            <div className="text-[10px] text-gray-400 font-medium">{c.reach} Emails Delivered</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export const components = {
  CampaignPerformanceWidget,
};
