'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  Loader2,
} from 'lucide-react';
import { authClient } from '@/lib/auth-client';

export default function GuestOrdersPage() {
  const { locale } = useParams();
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) {
      router.push(`/${locale}/login`);
      return;
    }
    fetch('/api/guest/orders')
      .then((r) => (r.ok ? r.json() : { orders: [] }))
      .then((data) => setOrders(data.orders ?? []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [session, locale, router]);

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

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-10 w-10 animate-spin text-brand-600" />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-[2.5rem] border border-gray-100">
          <ShoppingBag className="h-16 w-16 text-gray-200 mx-auto mb-4" />
          <h3 className="text-xl font-black text-gray-900 mb-2">No orders yet</h3>
          <p className="text-gray-500">Your on-site orders, rentals, and services will appear here.</p>
        </div>
      ) : (
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
      )}
    </div>
  );
}
