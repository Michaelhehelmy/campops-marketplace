import React from 'react';

/**
 * ICalSyncWidget
 * ──────────────
 * Displays the status of external iCal calendar synchronisation.
 */
export function ICalSyncWidget() {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4 animate-in fade-in slide-in-from-left-4 duration-500">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-gray-900">iCal Sync Status</h4>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
            Active
          </span>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between group">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div>
              <div className="text-sm font-bold text-gray-900">Airbnb Feed</div>
              <div className="text-[10px] text-gray-400">Synced 12m ago</div>
            </div>
          </div>
          <button className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold text-brand-600 uppercase hover:underline">
            Sync Now
          </button>
        </div>

        <div className="flex items-center justify-between group">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div>
              <div className="text-sm font-bold text-gray-900">Booking.com</div>
              <div className="text-[10px] text-gray-400">Synced 45m ago</div>
            </div>
          </div>
          <button className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold text-brand-600 uppercase hover:underline">
            Sync Now
          </button>
        </div>
      </div>
    </div>
  );
}

export const components = {
  ICalSyncWidget,
};
