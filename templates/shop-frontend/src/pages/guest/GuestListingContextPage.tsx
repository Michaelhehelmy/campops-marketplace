import { useParams } from "react-router-dom";
import { PluginSlot, Slots } from "@/components/PluginSlot";
import { Lock } from "lucide-react";

/**
 * GuestListingContextPage
 * Shows listing-internal data (menus, activities, live bill) to a guest
 * who has an active reservation at this listing.
 * Date-gated: only accessible between check-in and check-out.
 */
export default function GuestListingContextPage() {
  const { slug } = useParams<{ slug: string }>();

  // In production: verify the guest has an active reservation at `slug`
  const hasActiveReservation = true; // Placeholder

  if (!hasActiveReservation) {
    return (
      <div
        className="flex flex-col items-center justify-center py-24 text-center"
        data-testid="listing-context-locked"
      >
        <Lock className="text-gray-300 mb-4" size={48} />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h2>
        <p className="text-gray-500 max-w-md">
          This page is only accessible during your active stay at this listing.
        </p>
      </div>
    );
  }

  return (
    <div
      className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700"
      data-testid="guest-listing-context-page"
    >
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Your Stay at {slug}</h1>
        <p className="text-gray-500 mt-1">Explore what's available during your stay</p>
      </div>

      {/* Plugin slot – listing injects its own guest portal content here */}
      <PluginSlot
        name={Slots.DASHBOARD_WIDGETS}
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
      />

      <div className="grid md:grid-cols-3 gap-6">
        {["Order Food & Drinks", "Book Activities", "View Your Bill"].map((action) => (
          <div
            key={action}
            className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm text-center hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="text-3xl mb-3">
              {action === "Order Food & Drinks" ? "🍽️" : action === "Book Activities" ? "🎯" : "💰"}
            </div>
            <div className="font-semibold text-gray-900">{action}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
