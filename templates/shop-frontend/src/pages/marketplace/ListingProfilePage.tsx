import { useParams, Link } from "react-router-dom";
import { MapPin, Star, ArrowRight, Calendar, Check } from "lucide-react";
import { PluginSlot, Slots } from "@/components/PluginSlot";

const MOCK_LISTING = {
  name: "Acacia Camp",
  location: "Nairobi, Kenya",
  description:
    "Nestled in the heart of the savanna, Acacia Camp offers an unparalleled safari experience. Wake up to the sounds of wildlife and enjoy world-class hospitality in a breathtaking natural setting.",
  rating: 4.9,
  reviews: 312,
  category: "Safari Camp",
  price: 280,
  amenities: [
    "Swimming Pool",
    "Restaurant & Bar",
    "Safari Drives",
    "Spa & Wellness",
    "Wi-Fi",
    "Airport Transfer",
  ],
  highlights: [
    "UNESCO Heritage Site proximity",
    "Big Five sightings guaranteed",
    "All-inclusive packages available",
  ],
};

export default function ListingProfilePage() {
  const { slug } = useParams<{ slug: string }>();

  return (
    <div className="min-h-screen bg-white" data-testid="listing-profile-page">
      {/* Hero Image */}
      <div className="h-[400px] bg-gradient-to-br from-emerald-800 to-teal-900 flex items-center justify-center text-8xl">
        🏕️
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-3 gap-12">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-10">
            {/* Header */}
            <div>
              <div className="flex items-center gap-2 text-sm text-emerald-600 font-semibold uppercase tracking-wider mb-2">
                <MapPin size={14} /> {MOCK_LISTING.location}
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-3">{MOCK_LISTING.name}</h1>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Star size={16} className="fill-yellow-400 text-yellow-400" />
                  <span className="font-bold text-gray-900">{MOCK_LISTING.rating}</span>
                </div>
                <span className="text-gray-500">({MOCK_LISTING.reviews} reviews)</span>
                <span className="bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-1 rounded-full">
                  {MOCK_LISTING.category}
                </span>
              </div>
            </div>

            {/* Description */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">About This Property</h2>
              <p className="text-gray-600 leading-relaxed">{MOCK_LISTING.description}</p>
            </section>

            {/* Plugin slot for listing content extensions */}
            <PluginSlot name={Slots.DASHBOARD_TOP} />

            {/* Highlights */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Why You'll Love It</h2>
              <ul className="space-y-3">
                {MOCK_LISTING.highlights.map((h) => (
                  <li key={h} className="flex items-center gap-3 text-gray-700">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                      <Check size={14} className="text-emerald-600" />
                    </div>
                    {h}
                  </li>
                ))}
              </ul>
            </section>

            {/* Amenities */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Amenities</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {MOCK_LISTING.amenities.map((a) => (
                  <div
                    key={a}
                    className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-xl p-3"
                  >
                    <Check size={14} className="text-emerald-500" /> {a}
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Booking Card */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 bg-white border border-gray-200 rounded-3xl shadow-xl p-8 space-y-6">
              <div>
                <span className="text-3xl font-bold text-gray-900">${MOCK_LISTING.price}</span>
                <span className="text-gray-500"> / night</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Star size={14} className="fill-yellow-400 text-yellow-400" />
                <span className="font-semibold">{MOCK_LISTING.rating}</span>
                <span>({MOCK_LISTING.reviews} reviews)</span>
              </div>

              <div className="space-y-3">
                <div className="border border-gray-200 rounded-xl p-4">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Check-in
                  </label>
                  <input
                    id="listing-checkin-date"
                    type="date"
                    className="w-full mt-1 text-gray-900 outline-none"
                  />
                </div>
                <div className="border border-gray-200 rounded-xl p-4">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Check-out
                  </label>
                  <input
                    id="listing-checkout-date"
                    type="date"
                    className="w-full mt-1 text-gray-900 outline-none"
                  />
                </div>
              </div>

              <Link
                to={`/listing/${slug}/booking`}
                className="block w-full bg-emerald-600 text-white text-center py-4 rounded-xl font-bold hover:bg-emerald-700 transition-colors"
                data-testid="book-now-btn"
              >
                Book Now <ArrowRight className="inline ml-2" size={16} />
              </Link>

              <p className="text-xs text-center text-gray-500">No charge until confirmed</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
