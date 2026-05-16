import React, { useState, useEffect } from 'react';

export function MasterDashboard() {
  const [commissions, setCommissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/p/finance/commissions')
      .then((res) => res.json())
      .then((data) => {
        if (data.commissions) setCommissions(data.commissions);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading commissions...</div>;

  const total = commissions.reduce((sum, c) => sum + c.amount, 0);

  return (
    <div
      data-testid="master-finance-dashboard"
      className="space-y-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm"
    >
      <h3 className="text-xl font-bold">Platform Commissions</h3>
      <div className="text-3xl font-bold text-green-600">${total.toFixed(2)}</div>

      <div className="mt-6 space-y-2">
        <h4 className="font-bold text-gray-700">Recent Transactions</h4>
        {commissions.length === 0 ? (
          <p className="text-gray-500">No commissions yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2">Listing</th>
                <th className="py-2">Amount</th>
                <th className="py-2">Status</th>
                <th className="py-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {commissions.slice(0, 10).map((c) => (
                <tr key={c.id} className="border-b border-gray-50">
                  <td className="py-2">{c.listing_id}</td>
                  <td className="py-2 font-bold">${c.amount.toFixed(2)}</td>
                  <td className="py-2">
                    <span className="px-2 py-1 rounded bg-gray-100 text-xs">{c.status}</span>
                  </td>
                  <td className="py-2 text-gray-500">
                    {new Date(c.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export function ManagerDashboard({ listingId }: { listingId: string }) {
  const [commissions, setCommissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/p/finance/commissions`, {
      headers: { 'x-tenant-id': listingId },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.commissions) setCommissions(data.commissions);
      })
      .finally(() => setLoading(false));
  }, [listingId]);

  if (loading) return <div>Loading financial data...</div>;

  const totalFees = commissions.reduce((sum, c) => sum + c.amount, 0);

  return (
    <div
      data-testid="manager-finance-dashboard"
      className="space-y-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm"
    >
      <h3 className="text-xl font-bold">Platform Fees Paid</h3>
      <div className="text-3xl font-bold text-red-500">${totalFees.toFixed(2)}</div>

      <div className="mt-6 space-y-2">
        {commissions.length === 0 ? (
          <p className="text-gray-500">No fees recorded.</p>
        ) : (
          <div className="space-y-2">
            {commissions.slice(0, 5).map((c) => (
              <div
                key={c.id}
                className="flex justify-between items-center py-2 border-b border-gray-50"
              >
                <div>
                  <div className="font-bold">Fee for {c.booking_id}</div>
                  <div className="text-xs text-gray-500">
                    {new Date(c.created_at).toLocaleString()}
                  </div>
                </div>
                <div className="font-bold text-red-500">-${c.amount.toFixed(2)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function registerPlugin(registry: any) {
  registry.register('finance:MasterDashboard', MasterDashboard);
  registry.register('finance:ManagerDashboard', ManagerDashboard);
}
