import React from 'react';

/**
 * StaffAttendanceWidget
 * ─────────────────────
 * Shows who's on-site and clocked in.
 */
export function StaffAttendanceWidget() {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-gray-900">Staff On-Site</h4>
        <div className="bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
          12 Clocked In
        </div>
      </div>

      <div className="flex -space-x-2 overflow-hidden">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-gray-200">
            <div className="w-full h-full rounded-full bg-brand-100 flex items-center justify-center text-[10px] font-bold text-brand-600">
              S{i}
            </div>
          </div>
        ))}
        <div className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-gray-50 flex items-center justify-center text-[10px] font-medium text-gray-400">
          +7
        </div>
      </div>

      <div className="pt-2 grid grid-cols-2 gap-2">
        <div className="p-3 bg-gray-50 rounded-xl">
          <div className="text-xs text-gray-400 font-bold uppercase tracking-widest">
            Total Hours
          </div>
          <div className="text-lg font-black text-gray-900">442.5</div>
        </div>
        <div className="p-3 bg-gray-50 rounded-xl">
          <div className="text-xs text-gray-400 font-bold uppercase tracking-widest">
            Est. Payroll
          </div>
          <div className="text-lg font-black text-gray-900">$8,850</div>
        </div>
      </div>
    </div>
  );
}

export const components = {
  StaffAttendanceWidget,
};
