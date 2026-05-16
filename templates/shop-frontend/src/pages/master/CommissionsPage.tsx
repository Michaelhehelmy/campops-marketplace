import { DollarSign, TrendingUp, Building2 } from "lucide-react";
import { Card } from "@/components/ui/Card";

const MOCK_COMMISSIONS = [
  { listing: "Acacia Camp", period: "Apr 2026", revenue: 12400, rate: 12, commission: 1488 },
  { listing: "Blue Lagoon Lodge", period: "Apr 2026", revenue: 8900, rate: 12, commission: 1068 },
  { listing: "Highland Retreat", period: "Apr 2026", revenue: 6100, rate: 10, commission: 610 },
  { listing: "Coast Glamping", period: "Apr 2026", revenue: 9750, rate: 12, commission: 1170 },
];

export default function CommissionsPage() {
  const total = MOCK_COMMISSIONS.reduce((sum, r) => sum + r.commission, 0);

  return (
    <div
      className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700"
      data-testid="commissions-page"
    >
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Commission Report</h1>
        <p className="text-gray-500 mt-1">Global marketplace commission overview</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="p-6 border-none shadow-sm rounded-3xl">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center mb-4">
            <DollarSign className="text-emerald-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900">${total.toLocaleString()}</div>
          <div className="text-sm text-gray-500 mt-1">Total Commission (Apr 2026)</div>
        </Card>
        <Card className="p-6 border-none shadow-sm rounded-3xl">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
            <Building2 className="text-blue-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{MOCK_COMMISSIONS.length}</div>
          <div className="text-sm text-gray-500 mt-1">Active Billing Listings</div>
        </Card>
        <Card className="p-6 border-none shadow-sm rounded-3xl">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center mb-4">
            <TrendingUp className="text-purple-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900">11.8%</div>
          <div className="text-sm text-gray-500 mt-1">Average Commission Rate</div>
        </Card>
      </div>

      <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
        <table className="w-full" data-testid="commissions-table">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left py-4 px-6 text-xs font-bold text-gray-500 uppercase">
                Listing
              </th>
              <th className="text-left py-4 px-6 text-xs font-bold text-gray-500 uppercase">
                Period
              </th>
              <th className="text-right py-4 px-6 text-xs font-bold text-gray-500 uppercase">
                Revenue
              </th>
              <th className="text-right py-4 px-6 text-xs font-bold text-gray-500 uppercase">
                Rate
              </th>
              <th className="text-right py-4 px-6 text-xs font-bold text-gray-500 uppercase">
                Commission
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {MOCK_COMMISSIONS.map((row) => (
              <tr key={row.listing} className="hover:bg-gray-50 transition-colors">
                <td className="py-4 px-6 font-semibold text-gray-900">{row.listing}</td>
                <td className="py-4 px-6 text-sm text-gray-500">{row.period}</td>
                <td className="py-4 px-6 text-sm text-gray-900 text-right">
                  ${row.revenue.toLocaleString()}
                </td>
                <td className="py-4 px-6 text-sm text-gray-900 text-right">{row.rate}%</td>
                <td className="py-4 px-6 font-bold text-emerald-600 text-right">
                  ${row.commission.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
