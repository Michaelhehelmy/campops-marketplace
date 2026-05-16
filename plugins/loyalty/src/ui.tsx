import React from 'react';

/**
 * PointsWidget
 * ────────────
 * Displays the guest's loyalty points and tier status on the guest dashboard.
 */
export function PointsWidget() {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-gray-900">SinaiCamps Rewards</h4>
        <div className="bg-brand-100 text-brand-600 px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider">
          Gold Tier
        </div>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <div className="text-3xl font-bold text-gray-900">12,450</div>
          <div className="text-xs text-gray-500 font-medium uppercase tracking-widest">
            Available Points
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-bold text-brand-600">$124.50</div>
          <div className="text-[10px] text-gray-400 font-medium">Value in USD</div>
        </div>
      </div>
      <div className="pt-2">
        <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
          <div className="bg-brand-600 h-full w-[75%]" />
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-[10px] text-gray-400 font-bold uppercase">7,550 to Platinum</span>
          <span className="text-[10px] text-gray-400 font-bold uppercase">75%</span>
        </div>
      </div>
    </div>
  );
}

/**
 * AdminPage
 * ─────────
 * Admin interface for managing loyalty programs.
 */
export function AdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-gray-900">Loyalty Management</h3>
        <p className="text-gray-500 text-sm">Configure points multipliers and reward tiers.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Active Members', value: '1,284', color: 'bg-blue-500' },
          { label: 'Points Issued', value: '450k', color: 'bg-green-500' },
          { label: 'Points Redeemed', value: '120k', color: 'bg-purple-500' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm"
          >
            <div className="text-sm text-gray-500 mb-1">{stat.label}</div>
            <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500 font-medium">
            <tr>
              <th className="px-6 py-4">Tier Name</th>
              <th className="px-6 py-4">Multiplier</th>
              <th className="px-6 py-4">Threshold</th>
              <th className="px-6 py-4">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <tr>
              <td className="px-6 py-4 font-medium">Silver</td>
              <td className="px-6 py-4">1.0x</td>
              <td className="px-6 py-4">0 pts</td>
              <td className="px-6 py-4 text-brand-600 font-bold cursor-pointer">Edit</td>
            </tr>
            <tr>
              <td className="px-6 py-4 font-medium">Gold</td>
              <td className="px-6 py-4">1.2x</td>
              <td className="px-6 py-4">10,000 pts</td>
              <td className="px-6 py-4 text-brand-600 font-bold cursor-pointer">Edit</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * registerPlugin
 * ──────────────
 * Registration function for the loyalty plugin UI components.
 */
export function registerPlugin(registry: any) {
  registry.register('loyalty:PointsWidget', PointsWidget);
  registry.register('loyalty:AdminPage', AdminPage);
}
