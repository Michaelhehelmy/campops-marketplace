import React, { useState, useEffect } from 'react';

/**
 * ActivityWidget
 * ──────────────
 * Shows recent interactions for the current guest.
 */
export function ActivityWidget({ activeTab }: { activeTab?: string }) {
  if (activeTab && activeTab !== 'crm-activity' && activeTab !== 'dashboard') return null;
  const [activities, setActivities] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/p/crm/activities')
      .then((res) => res.json())
      .then((data) => {
        if (data.activities) {
          setActivities(data.activities);
        }
      })
      .catch((err) => console.error('Failed to fetch activities:', err));
  }, []);

  return (
    <div
      className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm"
      data-testid="crm-activity-widget"
      role="region"
      aria-label="Recent Activity"
    >
      <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Activity</h3>
      <div className="space-y-4">
        {activities.map((a) => (
          <div key={a.id} className="flex gap-4 items-start">
            <div
              className={`mt-1 w-2 h-2 rounded-full ${a.activity_type === 'BOOKING_CREATED' ? 'bg-brand-500' : 'bg-gray-300'}`}
            />
            <div>
              <div className="text-sm font-bold text-gray-900">
                {a.activity_type.replace('_', ' ')}
              </div>
              <div className="text-xs text-gray-500">{a.details}</div>
              <div className="text-[10px] text-gray-400 mt-1">
                {new Date(a.created_at).toLocaleString()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * GuestHistory
 * ────────────
 * Admin view of all guest interactions.
 */
export function GuestHistory({ activeTab }: { activeTab?: string }) {
  if (activeTab && activeTab !== 'crm-history') return null;
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Guest Interaction History</h2>
        <p className="text-gray-500">View and audit all activities across your guest base.</p>
      </div>

      <div className="bg-white p-8 rounded-2xl border border-gray-100 border-dashed text-center">
        <div className="text-gray-400 text-5xl mb-4">📋</div>
        <h3 className="text-lg font-bold text-gray-900">Advanced CRM Coming Soon</h3>
        <p className="text-gray-500 max-w-sm mx-auto">
          This is a placeholder for the full-featured CRM dashboard currently under development.
        </p>
      </div>
    </div>
  );
}

/**
 * Register components
 */
export function registerPlugin(registry: any) {
  registry.register('crm:ActivityWidget', ActivityWidget);
  registry.register('crm:GuestHistory', GuestHistory);
}
