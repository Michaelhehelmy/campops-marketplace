import React from "react";
import { componentRegistry } from "@/lib/ComponentRegistry";

/**
 * LoyaltyStatusWidget
 * ───────────────────
 * Displays the guest's loyalty points and tier status on the dashboard.
 */
export function LoyaltyStatusWidget() {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-gray-900">Beats Loyalty</h4>
        <div className="bg-brand-100 text-brand-600 px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider">
          Gold Tier
        </div>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <div className="text-3xl font-bold text-gray-900">12,450</div>
          <div className="text-xs text-gray-500 font-medium uppercase tracking-widest">
            Available Beats
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
 * bootstrapLoyalty
 * ────────────────
 * Registers loyalty components into the global registry.
 */
export function bootstrapLoyalty() {
  componentRegistry.register("loyalty:LoyaltyStatusWidget", LoyaltyStatusWidget);
}
