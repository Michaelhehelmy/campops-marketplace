import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Search, Filter, MapPin, Star, SlidersHorizontal } from "lucide-react";

const MOCK_RESULTS = [
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
  {
    slug: "savanna-dreams",
    name: "Savanna Dreams",
    location: "Masai Mara, Kenya",
    rating: 4.6,
    reviews: 205,
    category: "Safari Camp",
    price: 450,
  },
  {
    slug: "coast-glamping",
    name: "Coast Glamping",
    location: "Diani, Kenya",
    rating: 4.5,
    reviews: 143,
    category: "Glamping",
    price: 165,
  },
];

export default function SearchResultsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams({ q: query });
  };

  return (
    <div className="min-h-screen bg-gray-50" data-testid="search-results-page">
      {/* Search Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="flex-1 flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
              <Search className="text-gray-400" size={18} />
              <input
                id="search-results-input"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search camps, locations..."
                className="flex-1 bg-transparent text-gray-900 outline-none text-sm"
              />
            </div>
            <button
              type="submit"
              className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-emerald-700 transition-colors"
              data-testid="search-submit-btn"
            >
              Search
            </button>
          </form>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex gap-8">
          {/* Filters Sidebar */}
          <aside className="hidden md:block w-64 space-y-6" data-testid="filters-sidebar">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <SlidersHorizontal size={16} /> Filters
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">
                    Price Range
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      className="w-full border border-gray-200 rounded-lg p-2 text-sm"
                      id="price-min"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      className="w-full border border-gray-200 rounded-lg p-2 text-sm"
                      id="price-max"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">Category</label>
                  {["Safari Camp", "Beach Resort", "Mountain Lodge", "Glamping"].map((cat) => (
                    <label
                      key={cat}
                      className="flex items-center gap-2 text-sm text-gray-600 py-1 cursor-pointer"
                    >
                      <input type="checkbox" className="rounded" /> {cat}
                    </label>
                  ))}
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">
                    Min Rating
                  </label>
                  <select
                    className="w-full border border-gray-200 rounded-lg p-2 text-sm"
                    id="min-rating-select"
                  >
                    <option>Any</option>
                    <option>4+</option>
                    <option>4.5+</option>
                  </select>
                </div>
              </div>
            </div>
          </aside>

          {/* Results */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm text-gray-500">{MOCK_RESULTS.length} listings found</p>
              <select
                className="border border-gray-200 rounded-xl px-4 py-2 text-sm"
                id="sort-select"
              >
                <option>Most Popular</option>
                <option>Price: Low to High</option>
                <option>Price: High to Low</option>
                <option>Highest Rated</option>
              </select>
            </div>

            <div className="space-y-4">
              {MOCK_RESULTS.map((listing) => (
                <Link
                  key={listing.slug}
                  to={`/listing/${listing.slug}`}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all border border-gray-100 flex gap-6 p-4 group"
                  data-testid={`search-result-${listing.slug}`}
                >
                  <div className="w-40 h-32 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-50 flex items-center justify-center text-4xl flex-shrink-0">
                    🏕️
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 text-xs text-emerald-600 font-semibold uppercase">
                      <MapPin size={10} /> {listing.location}
                    </div>
                    <h3 className="font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">
                      {listing.name}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Star size={12} className="fill-yellow-400 text-yellow-400" />
                      <span className="font-semibold text-gray-900">{listing.rating}</span>
                      <span>({listing.reviews} reviews)</span>
                      <span className="text-gray-300">·</span>
                      <span>{listing.category}</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-bold text-gray-900">
                      From <span className="text-emerald-600 text-xl">${listing.price}</span>
                    </div>
                    <div className="text-xs text-gray-500">per night</div>
                    <button className="mt-3 bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors">
                      View Details
                    </button>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
