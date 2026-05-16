import { Link } from "react-router-dom";
import { Heart, ArrowRight } from "lucide-react";

export default function GuestFollowingPage() {
  return (
    <div
      className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700"
      data-testid="guest-following-page"
    >
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Following</h1>
        <p className="text-gray-500 mt-1">
          Listings you follow — get notified of availability and offers
        </p>
      </div>

      {/* Empty State */}
      <div className="bg-white rounded-3xl p-16 text-center border border-gray-100 shadow-sm">
        <Heart className="mx-auto text-gray-300 mb-4" size={48} />
        <h3 className="text-xl font-bold text-gray-900 mb-2">No Followed Listings</h3>
        <p className="text-gray-500 mb-8">
          Follow listings to stay updated with their availability, special offers, and new
          experiences.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 bg-emerald-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-emerald-700 transition-colors"
        >
          Discover Listings <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}
