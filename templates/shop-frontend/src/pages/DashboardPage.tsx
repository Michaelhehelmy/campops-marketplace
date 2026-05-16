import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { PluginSlot, Slots } from "@/components/PluginSlot";
import {
  Users,
  User,
  BedDouble,
  CalendarDays,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  PlusCircle,
  TrendingUp,
  LayoutDashboard,
  Wallet,
  Star,
} from "lucide-react";
import { DashboardGrid } from "@/components/dashboard/DashboardGrid";
import {
  useDashboardOverview,
  useRecentActivity,
  useGuestDashboard,
} from "@/hooks/queries/useDashboard";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatDistanceToNow } from "date-fns";
import { formatCurrency } from "@/lib/utils";

export default function DashboardPage() {
  const { user } = useAuth();
  const isAdminOrManager = user?.role === "admin" || user?.role === "manager";
  const isGuest = user?.role === "guest";

  const { data: overview, isLoading: loadingOverview } = useDashboardOverview(isAdminOrManager);
  const { data: activity, isLoading: loadingActivity } = useRecentActivity();
  const { data: guestData, isLoading: loadingGuest } = useGuestDashboard(isGuest);

  return (
    <div
      className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700"
      data-testid="dashboard-page"
    >
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-charcoal tracking-tight flex items-center gap-3">
            Dashboard
          </h1>
          <p className="text-stone-500 font-medium" data-testid="dashboard-welcome">
            Welcome back, {user?.full_name || "Guest"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to={isGuest ? "/booking" : "/reservations"}>
            <button className="flex items-center gap-2 bg-acacia text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-acacia/20 hover:bg-acacia/90 transition-all active:scale-95">
              <PlusCircle size={18} />
              {isGuest ? "Book a Stay" : "New Booking"}
            </button>
          </Link>
        </div>
      </div>

      {/* Plugin top slot */}
      <PluginSlot name={Slots.DASHBOARD_TOP} />

      {/* Quick Access Cards */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-serif font-bold text-charcoal">Quick Access</h3>
        </div>
        <DashboardGrid />
        {/* Plugin widget slot — injected after the DashboardGrid */}
        <PluginSlot
          name={Slots.DASHBOARD_WIDGETS}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        />
      </section>

      {/* Stats Grid - Role Based */}
      {isAdminOrManager && (
        <section>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-serif font-bold text-charcoal">Reservations Overview</h3>
            <Link
              to="/reservations"
              className="text-sm font-semibold text-acacia flex items-center gap-1 hover:underline"
            >
              View details <ArrowUpRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {loadingOverview ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-3xl" />
              ))
            ) : (
              <>
                <StatCard
                  label="Total Bookings"
                  value={overview?.totalBookings ?? 0}
                  icon={<CalendarDays className="text-orange-500" />}
                  bg="bg-orange-50"
                />
                <StatCard
                  label="Current Guests"
                  value={overview?.currentGuests ?? 0}
                  icon={<Users className="text-blue-500" />}
                  bg="bg-blue-50"
                />
                <StatCard
                  label="Upcoming Arrivals"
                  value={overview?.upcomingArrivals ?? 0}
                  icon={<BedDouble className="text-emerald-500" />}
                  bg="bg-emerald-50"
                />
                <StatCard
                  label="Available Tents"
                  value={overview?.availableTents ?? 0}
                  icon={<AlertTriangle className="text-rose-500" />}
                  bg="bg-rose-50"
                />
              </>
            )}
          </div>
        </section>
      )}

      {isGuest && (
        <section>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-serif font-bold text-charcoal">Your Stay at a Glance</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {loadingGuest ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-3xl" />
              ))
            ) : (
              <>
                <StatCard
                  label="Loyalty Points"
                  value={guestData?.points ?? 0}
                  icon={<Star className="text-yellow-500" />}
                  bg="bg-yellow-50"
                />
                <StatCard
                  label="Live Bill"
                  value={formatCurrency(guestData?.liveBillTotal ?? 0)}
                  icon={<Wallet className="text-emerald-500" />}
                  bg="bg-emerald-50"
                />
                <Card className="p-6 border-none shadow-sm rounded-3xl bg-acacia text-white">
                  <div className="flex flex-col h-full justify-between">
                    <div className="text-sm font-medium opacity-80 underline underline-offset-4">
                      Next Stay
                    </div>
                    <div className="mt-2">
                      {guestData?.nextStay ? (
                        <>
                          <div className="text-lg font-bold">{guestData.nextStay.room_name}</div>
                          <div className="text-xs opacity-80">
                            {new Date(guestData.nextStay.check_in).toLocaleDateString()} -{" "}
                            {new Date(guestData.nextStay.check_out).toLocaleDateString()}
                          </div>
                        </>
                      ) : (
                        <div className="text-sm">No upcoming stays</div>
                      )}
                    </div>
                  </div>
                </Card>
              </>
            )}
          </div>
        </section>
      )}

      {/* Main Content Grid */}
      <div className="grid md:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="md:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-serif font-bold text-charcoal">Recent Activity</h3>
            {isAdminOrManager && (
              <Link
                to="/admin/audit-logs"
                className="text-sm font-semibold text-stone-400 hover:text-acacia transition-colors"
              >
                View all
              </Link>
            )}
          </div>
          <Card className="p-2 border-none shadow-sm rounded-[2rem] overflow-hidden">
            <div className="divide-y divide-stone-100">
              {loadingActivity ? (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 m-2" />)
              ) : activity && activity.length > 0 ? (
                activity.map((act) => (
                  <div
                    key={act.id}
                    className="flex items-center gap-4 p-4 hover:bg-stone-50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-400">
                      <User size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-charcoal truncate">
                          {act.user_name || "System"}
                        </span>
                        <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider">
                          {formatDistanceToNow(new Date(act.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm text-stone-500 truncate">
                        {act.action.replace(/_/g, " ")} on {act.resource_type}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-stone-400">No recent activity</div>
              )}
            </div>
          </Card>
        </div>

        {/* Today at a Glance */}
        <div className="space-y-6">
          <h3 className="text-xl font-serif font-bold text-charcoal">Property Performance</h3>
          <Card className="p-6 border-none shadow-sm rounded-[2rem] space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between group cursor-pointer">
                <span className="text-sm font-bold text-charcoal group-hover:text-acacia transition-colors">
                  Check-ins Today
                </span>
                <div className="flex items-center gap-2 px-3 py-1 bg-stone-100 rounded-full">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">
                    {overview?.upcomingArrivals ?? 0}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between group cursor-pointer">
                <span className="text-sm font-bold text-charcoal group-hover:text-acacia transition-colors">
                  Tents Available
                </span>
                <div className="flex items-center gap-2 px-3 py-1 bg-stone-100 rounded-full">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">
                    {overview?.availableTents ?? 0}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-stone-100">
              <div className="flex flex-col items-center justify-center p-4 bg-acacia/5 rounded-2xl border border-acacia/10 text-center">
                {loadingOverview ? (
                  <Skeleton className="h-8 w-16 mb-1" />
                ) : (
                  <div className="text-2xl font-bold text-acacia mb-1">
                    {overview?.occupancyRate ?? 0}%
                  </div>
                )}
                <div className="text-[10px] font-bold text-acacia/60 uppercase tracking-widest">
                  Occupancy Rate
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Plugin bottom slot */}
      <PluginSlot name={Slots.DASHBOARD_BOTTOM} />
    </div>
  );
}

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
          <div className="text-3xl font-bold text-charcoal">{value}</div>
          <div className="text-sm font-medium text-stone-500">{label}</div>
        </div>
      </div>
    </Card>
  );
}
