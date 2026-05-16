import { Link } from "react-router-dom";
import { Building2, Users, DollarSign, TrendingUp, ArrowRight, Activity } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { PluginSlot, Slots } from "@/components/PluginSlot";

function MasterStatCard({
  label,
  value,
  delta,
  icon,
  bg,
}: {
  label: string;
  value: string | number;
  delta?: string;
  icon: React.ReactNode;
  bg: string;
}) {
  return (
    <Card className="p-6 border-none shadow-sm hover:shadow-md transition-shadow rounded-3xl">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-2xl ${bg} flex items-center justify-center`}>{icon}</div>
        {delta && (
          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
            {delta}
          </span>
        )}
      </div>
      <div className="text-3xl font-bold text-gray-900">{value}</div>
      <div className="text-sm font-medium text-gray-500 mt-1">{label}</div>
    </Card>
  );
}

export default function MasterDashboardPage() {
  return (
    <div
      className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700"
      data-testid="master-dashboard-page"
    >
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Marketplace Master Dashboard</h1>
        <p className="text-gray-500 mt-1">Global overview of the entire marketplace platform</p>
      </div>

      <PluginSlot name={Slots.DASHBOARD_TOP} />

      {/* Global Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <MasterStatCard
          label="Total Listings"
          value={47}
          delta="+3 this month"
          icon={<Building2 className="text-blue-500" />}
          bg="bg-blue-50"
        />
        <MasterStatCard
          label="Active Guests"
          value={1284}
          delta="+12%"
          icon={<Users className="text-emerald-500" />}
          bg="bg-emerald-50"
        />
        <MasterStatCard
          label="Monthly Revenue"
          value="$284,500"
          delta="+8.2%"
          icon={<DollarSign className="text-purple-500" />}
          bg="bg-purple-50"
        />
        <MasterStatCard
          label="Avg Occupancy"
          value="74%"
          delta="+2%"
          icon={<TrendingUp className="text-orange-500" />}
          bg="bg-orange-50"
        />
      </div>

      {/* Quick Links */}
      <div className="grid md:grid-cols-3 gap-6">
        {[
          {
            label: "All Listings",
            path: "/master/listings",
            icon: "🏕️",
            desc: "Manage and monitor all properties",
          },
          {
            label: "Plugin Catalog",
            path: "/master/plugins",
            icon: "🧩",
            desc: "Configure marketplace-wide plugins",
          },
          {
            label: "Commissions",
            path: "/master/commissions",
            icon: "💰",
            desc: "View global commission report",
          },
          {
            label: "Feature Config",
            path: "/master/feature-config",
            icon: "⚙️",
            desc: "Enable features per listing",
          },
          {
            label: "Admins",
            path: "/master/admins",
            icon: "👥",
            desc: "Manage listing admin accounts",
          },
          {
            label: "Audit Logs",
            path: "/master/logs",
            icon: "📋",
            desc: "Full platform audit trail",
          },
        ].map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all group"
            data-testid={`master-nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
          >
            <div className="text-3xl mb-3">{item.icon}</div>
            <h3 className="font-bold text-gray-900 group-hover:text-emerald-700 transition-colors flex items-center gap-2">
              {item.label}{" "}
              <ArrowRight
                size={14}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              />
            </h3>
            <p className="text-sm text-gray-500 mt-1">{item.desc}</p>
          </Link>
        ))}
      </div>

      {/* System Health */}
      <Card className="p-6 border-none shadow-sm rounded-3xl">
        <div className="flex items-center gap-3 mb-6">
          <Activity className="text-emerald-500" size={20} />
          <h2 className="text-lg font-bold text-gray-900">System Health</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { service: "API Gateway", status: "operational", uptime: "99.98%" },
            { service: "Database", status: "operational", uptime: "99.99%" },
            { service: "Plugin Runtime", status: "operational", uptime: "99.95%" },
          ].map((s) => (
            <div
              key={s.service}
              className="flex items-center justify-between bg-gray-50 rounded-xl p-4"
            >
              <div>
                <div className="font-semibold text-gray-900 text-sm">{s.service}</div>
                <div className="text-xs text-gray-500">{s.uptime} uptime</div>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-semibold text-emerald-600 capitalize">
                  {s.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <PluginSlot name={Slots.DASHBOARD_BOTTOM} />
    </div>
  );
}
