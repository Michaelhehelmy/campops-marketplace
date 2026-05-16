import React from 'react';

/**
 * SiteMinderStatusWidget
 * ──────────────────────
 * Displays the status of SiteMinder Channel Manager synchronisation.
 */
export function SiteMinderStatusWidget() {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-indigo-200">
            S
          </div>
          <div>
            <h4 className="font-bold text-gray-900 leading-none">SiteMinder</h4>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
              Channel Manager
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
              Connected
            </span>
          </div>
          <span className="text-[9px] text-gray-300 font-medium">Last heartbeats: 2s ago</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 pt-2">
        <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
          <div className="text-xl font-black text-gray-900">42</div>
          <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">
            Inventory Pushes
          </div>
        </div>
        <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
          <div className="text-xl font-black text-gray-900">18</div>
          <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">
            New Reservations
          </div>
        </div>
      </div>
    </div>
  );
}

export const components = {
  SiteMinderStatusWidget,
};
