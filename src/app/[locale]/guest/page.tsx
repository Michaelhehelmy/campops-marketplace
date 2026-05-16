'use client';

import { authClient } from '@/lib/auth-client';
import { PluginRegistryProvider } from '@/components/plugins/PluginRegistryProvider';
import { PluginShell } from '@/app/PluginShell';
import { Star, TrendingUp, MapPin, ShoppingBag } from 'lucide-react';

export default function GuestPortalPage({ params }: { params: { locale: string } }) {
  const { data: session } = authClient.useSession();

  return (
    <PluginRegistryProvider>
      <div className="space-y-12 animate-in fade-in duration-700">
        {/* Welcome Hero */}
        <div className="bg-slate-900 rounded-[3rem] p-12 text-white relative overflow-hidden shadow-2xl shadow-brand-900/10">
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-brand-600/20 to-transparent"></div>
          <div className="relative z-10">
            <p className="text-xs font-black uppercase tracking-widest text-brand-400 mb-2">
              Guest Dashboard
            </p>
            <h1 className="text-4xl font-black tracking-tight mb-4">
              Hello, {session?.user?.name || 'Explorer'}.
            </h1>
            <p className="text-slate-400 text-lg max-w-md mb-8">
              Welcome back to SinaiCamps. Ready to explore?
            </p>
            <div className="flex gap-4">
              <button className="bg-brand-600 hover:bg-brand-700 px-8 py-3 rounded-2xl font-bold transition-all">
                View Itinerary
              </button>
              <button className="bg-white/10 hover:bg-white/20 px-8 py-3 rounded-2xl font-bold transition-all border border-white/10">
                Manage Profile
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main Feed */}
          <div className="lg:col-span-2 space-y-10">
            <PluginShell
              name="guest.dashboard"
              props={{ guestEmail: session?.user?.email }}
              fallback={
                <section>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">Your Trips</h2>
                  </div>
                  <div className="space-y-4" data-testid="guest-reservations-list">
                    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-bold text-lg text-gray-900">Safari Camp</h3>
                          <p className="text-sm text-gray-500">Maasai Mara, Kenya</p>
                        </div>
                        <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full">
                          Confirmed
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>Jan 1 - Jan 2, 2025</span>
                        <span>•</span>
                        <span>1 night</span>
                      </div>
                    </div>
                  </div>
                </section>
              }
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/40">
              <h3 className="text-lg font-black text-gray-900 mb-6">Pro Status</h3>
              <div className="bg-brand-50 p-6 rounded-[2rem] border border-brand-100">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="h-4 w-4 text-brand-600 fill-brand-600" />
                  <span className="text-sm font-black text-brand-600">Pro Traveler</span>
                </div>
                <p className="text-xs text-brand-700/70">
                  You're in the top 5% of explorers this year. Unlock exclusive perks at
                  participating camps.
                </p>
              </div>
            </div>

            <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden group">
              <TrendingUp className="absolute top-[-20px] right-[-20px] h-32 w-32 text-brand-600/20 rotate-12" />
              <h3 className="text-lg font-black mb-4 relative z-10">Contextual Perks</h3>
              <p className="text-sm text-slate-400 mb-6 relative z-10 leading-relaxed">
                Stay active to unlock personalized perks and camp maps.
              </p>
              <div className="space-y-3 relative z-10">
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all cursor-pointer">
                  <div className="h-8 w-8 rounded-xl bg-brand-600/20 flex items-center justify-center text-brand-400">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-bold">Interactive Camp Map</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all cursor-pointer">
                  <div className="h-8 w-8 rounded-xl bg-orange-600/20 flex items-center justify-center text-orange-400">
                    <ShoppingBag className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-bold">Pre-Arrival Room Service</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12">
          <PluginShell
            name="guest.dashboard.bottom"
            fallback={
              <div
                role="region"
                aria-label="Recent Activity"
                className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/40 p-8"
              >
                <h3 className="text-lg font-black text-gray-900 mb-6">Recent Activity</h3>
                <div className="space-y-3">
                  {[
                    {
                      label: 'BOOKING CREATED',
                      desc: 'Safari Camp — Jun 10–15',
                      time: '2h ago',
                      color: 'brand',
                    },
                    { label: 'CHECK-IN', desc: 'Mountain Lodge', time: '3d ago', color: 'blue' },
                    {
                      label: 'REVIEW SUBMITTED',
                      desc: 'Safari Camp',
                      time: '1w ago',
                      color: 'green',
                    },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50">
                      <span className="text-[10px] font-black text-brand-600 uppercase tracking-widest bg-brand-50 px-2 py-1 rounded-lg">
                        {item.label}
                      </span>
                      <span className="text-sm text-gray-700 flex-1">{item.desc}</span>
                      <span className="text-[10px] text-gray-400">{item.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            }
          />
        </div>
      </div>
    </PluginRegistryProvider>
  );
}
