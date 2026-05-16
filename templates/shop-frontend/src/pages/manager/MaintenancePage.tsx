import { useParams } from "react-router-dom";
import { Wrench, Plus } from "lucide-react";
import { PluginSlot, Slots } from "@/components/PluginSlot";

export default function MaintenancePage() {
  const { listingId } = useParams<{ listingId: string }>();

  return (
    <div
      className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700"
      data-testid="maintenance-page"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Maintenance</h1>
          <p className="text-gray-500 mt-1">Work orders and maintenance requests</p>
        </div>
        <button
          id="create-work-order-btn"
          className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-emerald-700 transition-colors"
        >
          <Plus size={18} /> New Work Order
        </button>
      </div>

      {/* Plugin slot — maintenance plugin injects work order list */}
      <PluginSlot name={Slots.DASHBOARD_WIDGETS} />

      {/* Default empty state */}
      <div className="bg-white rounded-3xl p-16 text-center border border-gray-100 shadow-sm">
        <Wrench className="mx-auto text-gray-300 mb-4" size={48} />
        <h3 className="text-xl font-bold text-gray-900 mb-2">No Open Work Orders</h3>
        <p className="text-gray-500">
          All maintenance tasks are up to date for listing {listingId}.
        </p>
      </div>
    </div>
  );
}
