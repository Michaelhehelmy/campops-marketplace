import { Link } from "react-router-dom";
import { CalendarDays, ArrowRight, Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function GuestReservationsPage() {
  const { user } = useAuth();

  return (
    <div
      className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700"
      data-testid="guest-reservations-page"
    >
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Reservations</h1>
        <p className="text-gray-500 mt-1">Manage your upcoming and past stays</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-100">
        {["Upcoming", "Active", "Completed", "Cancelled"].map((tab) => (
          <button
            key={tab}
            id={`tab-${tab.toLowerCase()}`}
            className="pb-3 text-sm font-semibold text-gray-500 border-b-2 border-transparent hover:text-gray-900 hover:border-emerald-600 transition-colors first:border-emerald-600 first:text-gray-900"
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Empty State */}
      <div className="bg-white rounded-3xl p-16 text-center border border-gray-100 shadow-sm">
        <CalendarDays className="mx-auto text-gray-300 mb-4" size={48} />
        <h3 className="text-xl font-bold text-gray-900 mb-2">No Reservations Yet</h3>
        <p className="text-gray-500 mb-8">
          Your upcoming reservations will appear here. Start by finding your perfect camp.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 bg-emerald-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-emerald-700 transition-colors"
        >
          Explore Listings <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}
