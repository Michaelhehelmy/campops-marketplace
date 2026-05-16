'use client';

import React, { useEffect, useState } from 'react';
import { TrendingUp, DollarSign, Percent, ArrowUpRight } from 'lucide-react';

interface MarketplaceStats {
  total_revenue_cents: number;
  total_commission_cents: number;
  total_net_payout_cents: number;
  total_transactions: number;
}

export function MarketplaceInsights({ propertyId }: { propertyId: string }) {
  const [stats, setStats] = useState<MarketplaceStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch(
          `/api/payments/commission?propertyId=${propertyId}&type=transactions&limit=1`
        );
        if (res.ok) {
          const data = await res.json();
          setStats(data.summary);
        }
      } catch (err) {
        console.error('Failed to fetch marketplace stats:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [propertyId]);

  if (loading) {
    return (
      <div className="bg-white p-8 rounded-[2rem] shadow-xl shadow-gray-200/50 border border-gray-100 animate-pulse">
        <div className="h-8 bg-gray-100 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-gray-100 rounded w-1/2 mb-8"></div>
        <div className="h-48 bg-gray-50 rounded-2xl"></div>
      </div>
    );
  }

  if (!stats) return null;

  const revenue = stats.total_revenue_cents / 100;
  const commission = stats.total_commission_cents / 100;
  const net = stats.total_net_payout_cents / 100;
  const effectiveRate = revenue > 0 ? (commission / revenue) * 100 : 10;

  return (
    <div className="bg-white p-8 rounded-[2rem] shadow-xl shadow-gray-200/50 border border-gray-100">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-2xl font-black text-gray-900 tracking-tight">
            Marketplace Performance
          </h3>
          <p className="text-gray-500 text-sm mt-1">Direct insights from the SinaiCamps network</p>
        </div>
        <div className="bg-brand-50 p-2 rounded-xl text-brand-600">
          <TrendingUp className="h-5 w-5" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-50 p-6 rounded-2xl">
          <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1 text-center">
            Gross Revenue
          </div>
          <div className="text-2xl font-black text-gray-900 text-center">
            ${revenue.toLocaleString()}
          </div>
        </div>
        <div className="bg-gray-50 p-6 rounded-2xl">
          <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1 text-center">
            Commission
          </div>
          <div className="text-2xl font-black text-red-600 text-center">
            -${commission.toLocaleString()}
          </div>
        </div>
        <div className="bg-gray-50 p-6 rounded-2xl border-2 border-brand-100">
          <div className="text-[10px] text-brand-400 font-bold uppercase tracking-widest mb-1 text-center">
            Net Payout
          </div>
          <div className="text-2xl font-black text-brand-600 text-center">
            ${net.toLocaleString()}
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Percent className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-500 font-medium">Effective Marketplace Rate</span>
        </div>
        <span className="font-black text-gray-900">{effectiveRate.toFixed(1)}%</span>
      </div>
    </div>
  );
}

export function MarketplaceFeesWidget({ propertyId }: { propertyId: string }) {
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    async function fetchBalance() {
      try {
        const res = await fetch(
          `/api/payments/commission?propertyId=${propertyId}&type=transactions&status=pending`
        );
        if (res.ok) {
          const data = await res.json();
          setBalance(data.summary.total_commission_cents / 100);
        }
      } catch (err) {}
    }
    fetchBalance();
  }, [propertyId]);

  return (
    <div className="bg-gradient-to-br from-brand-600 to-brand-800 p-8 rounded-[2rem] text-white shadow-xl shadow-brand-100">
      <h4 className="text-xl font-black mb-2 tracking-tight">Marketplace Fees</h4>
      <p className="text-brand-100 text-sm mb-6">Pending commission from recent bookings.</p>
      <div className="text-3xl font-black mb-1">${balance.toLocaleString()}</div>
      <div className="text-[10px] text-brand-200 font-bold uppercase tracking-widest mb-6">
        Pending Balance
      </div>
      <button className="w-full py-4 bg-white text-brand-600 rounded-2xl font-black text-sm shadow-lg shadow-brand-900/20 hover:scale-[1.02] active:scale-95 transition-all">
        View Invoices
      </button>
    </div>
  );
}
