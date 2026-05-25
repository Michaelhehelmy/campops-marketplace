'use client';

import { authClient } from '@/lib/auth-client';
import { PluginRegistryProvider } from '@/components/plugins/PluginRegistryProvider';
import { PluginShell } from '@/app/PluginShell';
import { Star, Award, Shield, Gift, Sparkles } from 'lucide-react';

function PointsWidgetFallback() {
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

export default function LoyaltyPage({ params }: { params: { locale: string } }) {
  const { data: session } = authClient.useSession();

  return (
    <PluginRegistryProvider>
      <div className="max-w-5xl mx-auto space-y-12 py-12 px-6 animate-in fade-in duration-700">
        {/* Loyalty Hero Banner */}
        <div className="bg-slate-950 rounded-[3rem] p-12 text-white relative overflow-hidden shadow-2xl shadow-brand-900/10 border border-slate-800">
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-brand-500/20 to-transparent"></div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="space-y-4 max-w-xl">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-brand-400 fill-brand-400" />
                <span className="text-xs font-black uppercase tracking-widest text-brand-400">
                  Loyalty Program
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight">
                Unlock Elite Campsite Rewards
              </h1>
              <p className="text-slate-400 text-lg leading-relaxed">
                Earn Beats points on every night stayed. Redeem points for free stays, exclusive
                experiences, and premium amenities.
              </p>
            </div>

            <div className="w-full md:w-80">
              <PluginShell name="loyalty.dashboard" fallback={<PointsWidgetFallback />} />
            </div>
          </div>
        </div>

        {/* Benefits & How It Works */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-white space-y-4">
            <div className="h-12 w-12 rounded-2xl bg-brand-500/10 flex items-center justify-center text-brand-400 border border-brand-500/20">
              <Award className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold">Earn Points</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Receive 10 Beats points for every $1 spent on accommodation, equipment rentals, and
              activities.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-white space-y-4">
            <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/20">
              <Shield className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold">Tier Perks</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Advance from Silver to Gold and Platinum tiers. Elite tiers unlock early check-in,
              late check-out, and welcome gifts.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-white space-y-4">
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
              <Gift className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold">Redeem Beats</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Use your points at checkout to discount your booking. 100 Beats points count as $1.00
              of real value.
            </p>
          </div>
        </div>
      </div>
    </PluginRegistryProvider>
  );
}
