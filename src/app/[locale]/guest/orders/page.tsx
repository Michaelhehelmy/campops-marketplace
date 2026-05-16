'use client';

import { useState } from 'react';
import {
  ShoppingBag,
  Search,
  Filter,
  ExternalLink,
  Clock,
  ChevronRight,
  Coffee,
  Pizza,
  Zap,
} from 'lucide-react';

export default function GuestOrdersPage() {
  const [orders, setOrders] = useState([
    {
      id: 'ORD-5521',
      property: 'Safari Luxury Camp',
      date: 'May 07, 2026',
      items: ['Gourmet Pizza', 'Iced Latte'],
      total: 42.5,
      status: 'delivered',
    },
    {
      id: 'ORD-5522',
      property: 'Safari Luxury Camp',
      date: 'May 07, 2026',
      items: ['Spa Massage (60min)'],
      total: 120.0,
      status: 'confirmed',
    },
    {
      id: 'ORD-4402',
      property: 'Mountain Retreat',
      date: 'Apr 12, 2026',
      items: ['Mountain Bike Rental'],
      total: 35.0,
      status: 'completed',
    },
  ]);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Orders & Activity</h1>
          <p className="text-gray-500 mt-2">History of on-site orders, rentals, and services.</p>
        </div>
        <div className="flex gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search orders..."
              className="pl-12 pr-4 py-3 rounded-2xl border border-gray-100 bg-white focus:border-brand-200 transition-all outline-none text-sm"
            />
          </div>
          <button className="p-3 bg-white rounded-2xl border border-gray-100 text-gray-400 hover:text-gray-900 transition-all shadow-sm">
            <Filter className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {orders.map((order) => (
          <div
            key={order.id}
            className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/40 p-8 flex flex-col md:flex-row justify-between gap-8 group hover:border-brand-200 transition-all cursor-pointer"
          >
            <div className="flex gap-8">
              <div className="h-20 w-20 rounded-[2rem] bg-gray-50 flex items-center justify-center text-gray-400 group-hover:text-brand-600 transition-colors">
                {order.items[0].includes('Pizza') ? (
                  <Pizza className="h-10 w-10" />
                ) : order.items[0].includes('Latte') ? (
                  <Coffee className="h-10 w-10" />
                ) : (
                  <Zap className="h-10 w-10" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-black text-gray-900 group-hover:text-brand-600 transition-colors">
                    {order.property}
                  </span>
                  <span className="h-1 w-1 rounded-full bg-gray-300"></span>
                  <span className="text-xs font-bold text-gray-400">{order.date}</span>
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-4">{order.items.join(', ')}</h3>
                <div className="flex gap-4">
                  <span
                    className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                      order.status === 'delivered'
                        ? 'bg-green-100 text-green-600'
                        : order.status === 'confirmed'
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {order.status}
                  </span>
                  <span className="text-xs font-bold text-gray-400 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {order.id}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between md:justify-end gap-12 pt-6 md:pt-0 border-t md:border-0 border-gray-50">
              <div className="text-right">
                <div className="text-2xl font-black text-gray-900">${order.total.toFixed(2)}</div>
                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                  Total Amount
                </div>
              </div>
              <button className="p-4 rounded-2xl bg-gray-50 text-gray-400 group-hover:bg-brand-600 group-hover:text-white transition-all">
                <ExternalLink className="h-5 w-5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="p-12 text-center">
        <div className="h-20 w-20 bg-gray-100 rounded-[2.5rem] flex items-center justify-center text-gray-300 mx-auto mb-6">
          <ShoppingBag className="h-10 w-10" />
        </div>
        <h3 className="text-xl font-black text-gray-900 mb-2">Order History</h3>
        <p className="text-gray-500 max-w-sm mx-auto">
          Showing your most recent orders. Older orders are archived after 90 days.
        </p>
      </div>
    </div>
  );
}
