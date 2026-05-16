import { Link } from "react-router-dom";
import { Building2, MapPin, Users, ArrowRight, TrendingUp, Search } from "lucide-react";
import { useState } from "react";

const MOCK_LISTINGS = [
  {
    id: "listing-001",
    name: "Acacia Camp",
    location: "Nairobi, Kenya",
    status: "active",
    guests: 42,
    occupancy: 85,
    revenue: 12400,
  },
  {
    id: "listing-002",
    name: "Blue Lagoon Lodge",
    location: "Mombasa, Kenya",
    status: "active",
    guests: 28,
    occupancy: 72,
    revenue: 8900,
  },
  {
    id: "listing-003",
    name: "Highland Retreat",
    location: "Mt. Kenya",
    status: "active",
    guests: 15,
    occupancy: 60,
    revenue: 6100,
  },
  {
    id: "listing-004",
    name: "Savanna Dreams",
    location: "Masai Mara",
    status: "inactive",
    guests: 0,
    occupancy: 0,
    revenue: 0,
  },
  {
    id: "listing-005",
    name: "Coast Glamping",
    location: "Diani",
    status: "active",
    guests: 33,
    occupancy: 78,
    revenue: 9750,
  },
];

export default function AllListingsPage() {
  const [search, setSearch] = useState("");

  const filtered = MOCK_LISTINGS.filter(
    (l) =>
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.location.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div
      className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700"
      data-testid="all-listings-page"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">All Listings</h1>
          <p className="text-gray-500 mt-1">{MOCK_LISTINGS.length} registered properties</p>
        </div>
        <button
          id="add-listing-btn"
          className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-2"
        >
          <Building2 size={16} /> Add Listing
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
        <Search className="text-gray-400" size={18} />
        <input
          id="listings-search"
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search listings..."
          className="flex-1 text-gray-900 outline-none text-sm"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full" data-testid="listings-table">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">
                Listing
              </th>
              <th className="text-left py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="text-left py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">
                Guests
              </th>
              <th className="text-left py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">
                Occupancy
              </th>
              <th className="text-left py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">
                Revenue
              </th>
              <th className="py-4 px-6" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((listing) => (
              <tr
                key={listing.id}
                className="hover:bg-gray-50 transition-colors"
                data-testid={`listing-row-${listing.id}`}
              >
                <td className="py-4 px-6">
                  <div className="font-semibold text-gray-900">{listing.name}</div>
                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    <MapPin size={10} /> {listing.location}
                  </div>
                </td>
                <td className="py-4 px-6">
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                      listing.status === "active"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${listing.status === "active" ? "bg-emerald-500" : "bg-gray-400"}`}
                    />
                    {listing.status}
                  </span>
                </td>
                <td className="py-4 px-6 text-sm text-gray-700">{listing.guests}</td>
                <td className="py-4 px-6">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${listing.occupancy}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-gray-700">
                      {listing.occupancy}%
                    </span>
                  </div>
                </td>
                <td className="py-4 px-6 text-sm font-semibold text-gray-900">
                  ${listing.revenue.toLocaleString()}
                </td>
                <td className="py-4 px-6">
                  <Link
                    to={`/master/listings/${listing.id}`}
                    className="text-emerald-600 hover:text-emerald-700 font-semibold text-sm flex items-center gap-1"
                  >
                    View <ArrowRight size={14} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
