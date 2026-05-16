import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Building2, Users, Settings } from "lucide-react";
import { Card } from "@/components/ui/Card";

export default function ListingDeepDivePage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div
      className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700"
      data-testid="listing-deep-dive-page"
    >
      <div className="flex items-center gap-4">
        <Link
          to="/master/listings"
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors text-sm font-medium"
        >
          <ArrowLeft size={16} /> All Listings
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Listing: {id}</h1>
          <p className="text-gray-500 mt-1">Deep-dive analytics and management controls</p>
        </div>
        <Link
          to={`/manage/${id}`}
          className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-emerald-700 transition-colors"
          data-testid="impersonate-admin-btn"
        >
          <Settings size={16} /> Open as Admin
        </Link>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {[
          {
            label: "Total Guests (YTD)",
            value: "1,284",
            icon: <Users className="text-blue-500" />,
            bg: "bg-blue-50",
          },
          {
            label: "Revenue (YTD)",
            value: "$284,500",
            icon: <Building2 className="text-emerald-500" />,
            bg: "bg-emerald-50",
          },
          {
            label: "Active Plugins",
            value: 8,
            icon: <Settings className="text-purple-500" />,
            bg: "bg-purple-50",
          },
        ].map((stat) => (
          <Card key={stat.label} className="p-6 border-none shadow-sm rounded-3xl">
            <div
              className={`w-12 h-12 rounded-2xl ${stat.bg} flex items-center justify-center mb-4`}
            >
              {stat.icon}
            </div>
            <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
            <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
          </Card>
        ))}
      </div>

      {/* Placeholder for listing-specific data */}
      <Card className="p-8 border-none shadow-sm rounded-3xl">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Plugin Configuration</h2>
        <p className="text-gray-500">
          Plugin management and feature flags for this listing are configured here.
        </p>
      </Card>
    </div>
  );
}
