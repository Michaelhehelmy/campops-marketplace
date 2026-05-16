import { useParams } from "react-router-dom";
import { LayoutDashboard, TrendingUp, Users, BedDouble, DollarSign } from "lucide-react";
import { PluginSlot, Slots } from "@/components/PluginSlot";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/contexts/AuthContext";

function StatCard({
  label,
  value,
  icon,
  bg,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  bg: string;
}) {
  return (
    <Card className="p-6 border-none shadow-sm hover:shadow-md transition-shadow rounded-3xl group">
      <div className="flex flex-col gap-4">
        <div
          className={`w-12 h-12 rounded-2xl ${bg} flex items-center justify-center transition-transform group-hover:scale-110`}
        >
          {icon}
        </div>
        <div>
          <div className="text-3xl font-bold text-gray-900">{value}</div>
          <div className="text-sm font-medium text-gray-500">{label}</div>
        </div>
      </div>
    </Card>
  );
}

export default function ListingOverviewPage() {
  const { listingId } = useParams<{ listingId: string }>();
  const { user } = useAuth();

  return (
    <div
      className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700"
      data-testid="listing-overview-page"
    >
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-emerald-600 font-semibold uppercase tracking-wider mb-2">
          <LayoutDashboard size={14} /> Listing Management
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Overview</h1>
        <p className="text-gray-500 mt-1">
          Managing listing: <span className="font-semibold text-gray-700">{listingId}</span>
          {" · "}Logged in as <span className="font-semibold text-gray-700">{user?.full_name}</span>
        </p>
      </div>

      {/* Plugin Top Slot */}
      <PluginSlot name={Slots.DASHBOARD_TOP} />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <StatCard
          label="Occupancy Rate"
          value="78%"
          icon={<TrendingUp className="text-emerald-500" />}
          bg="bg-emerald-50"
        />
        <StatCard
          label="Active Guests"
          value={24}
          icon={<Users className="text-blue-500" />}
          bg="bg-blue-50"
        />
        <StatCard
          label="Rooms Available"
          value={12}
          icon={<BedDouble className="text-orange-500" />}
          bg="bg-orange-50"
        />
        <StatCard
          label="Today's Revenue"
          value="$4,280"
          icon={<DollarSign className="text-purple-500" />}
          bg="bg-purple-50"
        />
      </div>

      {/* Plugin Widgets */}
      <PluginSlot
        name={Slots.DASHBOARD_WIDGETS}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      />
    </div>
  );
}
