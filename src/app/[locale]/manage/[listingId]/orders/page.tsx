'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  ShoppingBag,
  Search,
  Filter,
  Plus,
  CheckCircle2,
  Clock,
  ChevronRight,
  MoreHorizontal,
  DollarSign,
} from 'lucide-react';

export default function OrdersPage() {
  const params = useParams();
  const { listingId } = params;

  const [orders, setOrders] = useState<any[]>([
    {
      id: 'ORD-123',
      guest: 'John Doe',
      item: 'Firewood Bundle',
      amount: 15.0,
      status: 'completed',
    },
    { id: 'ORD-124', guest: 'Jane Smith', item: 'Ice Bag', amount: 5.0, status: 'pending' },
  ]);
  const [loading, setLoading] = useState(false);

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-10 w-64 bg-gray-100 rounded-xl mb-4"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-gray-100 rounded-3xl"></div>
          ))}
        </div>
        <div className="h-96 bg-gray-100 rounded-[2.5rem]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Recent Orders</h1>
          <p className="text-gray-500">Manage on-site sales and service requests.</p>
        </div>
        <button className="flex items-center gap-2 bg-brand-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-brand-700 transition-all shadow-xl shadow-brand-100">
          <Plus className="h-5 w-5" /> New Order
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatsCard title="Today's Sales" value="$1,240.50" icon={DollarSign} color="brand" />
        <StatsCard title="Pending Orders" value="3" icon={Clock} color="orange" />
        <StatsCard title="Avg. Order Value" value="$42.00" icon={ShoppingBag} color="blue" />
      </div>

      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/40 overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex items-center justify-between">
          <div className="relative w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search orders by ID or guest..."
              className="w-full pl-12 pr-4 py-3 rounded-2xl border border-gray-100 focus:border-brand-200 focus:ring-4 focus:ring-brand-50 transition-all outline-none text-sm"
            />
          </div>
          <button className="p-3 rounded-xl border border-gray-100 text-gray-400 hover:text-gray-900 transition-all">
            <Filter className="h-5 w-5" />
          </button>
        </div>

        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50/50">
              <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
                Order ID
              </th>
              <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
                Guest
              </th>
              <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
                Items
              </th>
              <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
                Amount
              </th>
              <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
                Status
              </th>
              <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50/50 transition-all group">
                <td className="px-8 py-6 font-bold text-gray-900">{order.id}</td>
                <td className="px-8 py-6 text-sm text-gray-600">{order.guest}</td>
                <td className="px-8 py-6 text-sm text-gray-900 font-medium">{order.item}</td>
                <td className="px-8 py-6 font-bold text-gray-900">${order.amount.toFixed(2)}</td>
                <td className="px-8 py-6">
                  <div className="flex items-center gap-2">
                    {order.status === 'completed' ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <Clock className="h-4 w-4 text-orange-500" />
                    )}
                    <span
                      className={`text-xs font-bold capitalize ${order.status === 'completed' ? 'text-green-600' : 'text-orange-600'}`}
                    >
                      {order.status}
                    </span>
                  </div>
                </td>
                <td className="px-8 py-6 text-right">
                  <button className="p-2 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-all">
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatsCard({ title, value, icon: Icon, color }: any) {
  const colors: any = {
    brand: 'text-brand-600 bg-brand-50',
    orange: 'text-orange-600 bg-orange-50',
    blue: 'text-blue-600 bg-blue-50',
  };

  return (
    <div className="bg-white p-6 rounded-3xl shadow-xl shadow-gray-200/40 border border-gray-50">
      <div className={`p-3 rounded-2xl ${colors[color]} w-fit mb-4`}>
        <Icon className="h-6 w-6" />
      </div>
      <div className="text-2xl font-black text-gray-900 tracking-tight">{value}</div>
      <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
        {title}
      </div>
    </div>
  );
}
