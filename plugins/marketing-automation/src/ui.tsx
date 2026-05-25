import React, { useState, useEffect } from 'react';

export function CampaignPerformanceWidget() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/p/marketing?section=campaigns')
      .then((res) => res.json())
      .then((data) => {
        if (data.campaigns) setCampaigns(data.campaigns);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-gray-900">Active Campaigns</h4>
        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Marketing</div>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400">Loading...</div>
      ) : campaigns.length === 0 ? (
        <div className="text-sm text-gray-400">No campaigns yet.</div>
      ) : (
        <div className="space-y-4">
          {campaigns.slice(0, 5).map((c: any) => (
            <div key={c.id} className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-gray-700">{c.name}</span>
                <span className="text-xs font-black text-gray-900">{c.status}</span>
              </div>
              <div className="w-full bg-gray-50 h-2 rounded-full overflow-hidden border border-gray-100">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${
                    c.status === 'sent' ? 'bg-emerald-500' : c.status === 'active' ? 'bg-indigo-600' : 'bg-gray-300'
                  }`}
                  style={{ width: c.status === 'sent' ? '100%' : c.status === 'active' ? '60%' : '20%' }}
                />
              </div>
              <div className="text-[10px] text-gray-400 font-medium">
                {c.recipient_count || 0} recipients · {c.open_count || 0} opens
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export const components = {
  CampaignPerformanceWidget,
};
