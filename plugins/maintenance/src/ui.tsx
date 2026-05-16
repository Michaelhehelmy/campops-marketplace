import React from 'react';

/**
 * ActiveWorkOrdersWidget
 * ──────────────────────
 * Dashboard widget for maintenance staff.
 */
export function ActiveWorkOrdersWidget() {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4 animate-in fade-in slide-in-from-left-4 duration-500">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-gray-900">Maintenance</h4>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-orange-500" />
          <span className="text-[10px] font-bold text-orange-600 uppercase tracking-widest">
            3 Urgent
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {[
          { id: 'WO-102', title: 'Shower Block B Leak', priority: 'High', time: '2h ago' },
          { id: 'WO-105', title: 'Wi-Fi Router Reset (P6)', priority: 'Medium', time: '4h ago' },
          { id: 'WO-108', title: 'Lawn Mowing Sector 3', priority: 'Low', time: '1d ago' },
        ].map((wo) => (
          <div
            key={wo.id}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 group hover:border-brand-200 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-1 h-8 rounded-full ${
                  wo.priority === 'High'
                    ? 'bg-rose-500'
                    : wo.priority === 'Medium'
                      ? 'bg-orange-500'
                      : 'bg-blue-500'
                }`}
              />
              <div>
                <div className="text-sm font-bold text-gray-900">{wo.title}</div>
                <div className="text-[10px] text-gray-400 font-medium">
                  {wo.id} • {wo.time}
                </div>
              </div>
            </div>
            <button className="text-[10px] font-bold text-brand-600 uppercase hover:underline">
              View
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export const components = {
  ActiveWorkOrdersWidget,
};
