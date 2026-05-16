'use client';

import React from 'react';
import { MarketplaceInsights } from '@/components/MarketplaceInsights';
import { TrendingUp, DollarSign, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function MarketplaceStatsPage({
  params,
}: {
  params: { listingId: string; locale: string };
}) {
  const { listingId, locale } = params;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">
            Marketplace Analytics
          </h1>
          <p className="text-gray-500 mt-1 font-medium">
            Detailed financial performance and distribution metrics.
          </p>
        </div>
        <Link
          href={`/${locale}/manage/${listingId}`}
          className="flex items-center gap-2 text-sm font-bold text-brand-600 bg-brand-50 px-4 py-2 rounded-xl hover:bg-brand-100 transition-all"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <MarketplaceInsights propertyId={listingId} />

        <div className="bg-white p-8 rounded-[2rem] shadow-xl shadow-gray-200/50 border border-gray-100">
          <h3 className="text-xl font-black text-gray-900 mb-6">Distribution Summary</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="pb-4 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                    Channel
                  </th>
                  <th className="pb-4 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                    Bookings
                  </th>
                  <th className="pb-4 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                    Revenue
                  </th>
                  <th className="pb-4 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                    Avg. Commission
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                <tr>
                  <td className="py-4 font-bold text-gray-900">Direct Marketplace</td>
                  <td className="py-4 text-gray-600">84</td>
                  <td className="py-4 text-gray-600">$12,450.00</td>
                  <td className="py-4 text-brand-600 font-bold">10.0%</td>
                </tr>
                <tr>
                  <td className="py-4 font-bold text-gray-900">Partner Network</td>
                  <td className="py-4 text-gray-600">12</td>
                  <td className="py-4 text-gray-600">$2,100.00</td>
                  <td className="py-4 text-brand-600 font-bold">15.0%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
