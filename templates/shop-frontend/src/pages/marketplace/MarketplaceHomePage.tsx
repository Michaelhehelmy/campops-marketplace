import { Link } from "react-router-dom";
import { Search, MapPin, Star, ArrowRight, Filter } from "lucide-react";
import { PluginSlot, Slots } from "@/components/PluginSlot";

const FEATURED_LISTINGS = [
  {
    slug: "acacia-camp",
    name: "Acacia Camp",
    location: "Nairobi, Kenya",
    rating: 4.9,
    reviews: 312,
    category: "Safari Camp",
    price: 280,
  },
  {
    slug: "blue-lagoon",
    name: "Blue Lagoon Lodge",
    location: "Mombasa, Kenya",
    rating: 4.7,
    reviews: 198,
    category: "Beach Resort",
    price: 195,
  },
  {
    slug: "highland-retreat",
    name: "Highland Retreat",
    location: "Mt. Kenya",
    rating: 4.8,
    reviews: 87,
    category: "Mountain Lodge",
    price: 340,
  },
];

const CATEGORIES = [
  "Safari Camps",
  "Beach Resorts",
  "Mountain Lodges",
  "City Hotels",
  "Eco Lodges",
  "Glamping",
];

export default function MarketplaceHomePage() {
  return (
    <div className="min-h-screen" data-testid="marketplace-home">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 text-white py-24 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h1 className="text-5xl md:text-6xl font-bold leading-tight">
            Find Your Perfect
            <br />
            <span className="text-emerald-300">Camp Experience</span>
          </h1>
          <p className="text-xl text-emerald-100 max-w-2xl mx-auto">
            Discover unique camps, lodges and retreats across Africa. Book directly with verified
            operators.
          </p>

          {/* Search Bar */}
          <div className="bg-white rounded-2xl p-3 flex gap-3 max-w-2xl mx-auto shadow-2xl">
            <div className="flex-1 flex items-center gap-3 px-4">
              <Search className="text-gray-400" size={20} />
              <input
                id="marketplace-search-input"
                type="text"
                placeholder="Search camps, locations..."
                className="flex-1 text-gray-900 outline-none text-base"
              />
            </div>
            <Link
              to="/search"
              className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-2"
              data-testid="search-button"
            >
              Search <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
        </div>
      </section>

      {/* Plugin Top Slot */}
      <PluginSlot name={Slots.DASHBOARD_TOP} />

      {/* Categories */}
      <section className="py-16 px-6 max-w-7xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-8">Browse by Category</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat}
              to={`/search?category=${encodeURIComponent(cat)}`}
              className="bg-white border border-gray-100 rounded-2xl p-6 text-center shadow-sm hover:shadow-md hover:border-emerald-200 transition-all group"
              data-testid={`category-${cat.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <div className="text-3xl mb-3">🏕️</div>
              <div className="text-sm font-semibold text-gray-700 group-hover:text-emerald-700 transition-colors">
                {cat}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Listings */}
      <section className="py-16 px-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Featured Listings</h2>
          <Link
            to="/search"
            className="text-emerald-600 font-semibold hover:underline flex items-center gap-1"
          >
            View all <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {FEATURED_LISTINGS.map((listing) => (
            <Link
              key={listing.slug}
              to={`/listing/${listing.slug}`}
              className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all group border border-gray-100"
              data-testid={`listing-card-${listing.slug}`}
            >
              <div className="h-48 bg-gradient-to-br from-emerald-100 to-teal-50 flex items-center justify-center text-5xl">
                🏕️
              </div>
              <div className="p-6 space-y-3">
                <div className="flex items-center gap-2 text-xs text-emerald-600 font-semibold uppercase tracking-wider">
                  <MapPin size={12} /> {listing.location}
                </div>
                <h3 className="font-bold text-gray-900 text-lg group-hover:text-emerald-700 transition-colors">
                  {listing.name}
                </h3>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Star size={14} className="fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold text-gray-900">{listing.rating}</span>
                  <span>({listing.reviews} reviews)</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <span className="text-xs text-gray-500">{listing.category}</span>
                  <span className="font-bold text-gray-900">
                    From <span className="text-emerald-600">${listing.price}</span>/night
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Plugin Bottom Slot */}
      <PluginSlot name={Slots.DASHBOARD_BOTTOM} />
    </div>
  );
}
