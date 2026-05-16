'use client';

import React from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Star, Wifi, Car, Utensils, Bed, MapPin, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface FeaturedListing {
  id: string;
  slug: string;
  name: string;
  primaryImage: string;
  shortDescription: string;
  pricePerNight: number;
  rating: number;
  amenities: string[];
}

interface FeaturedListingsProps {
  locale?: string;
  limit?: number;
}

function formatPrice(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function FeaturedListings({ locale = 'en', limit = 8 }: FeaturedListingsProps) {
  const router = useRouter();
  const [listings, setListings] = useState<FeaturedListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/public/featured-listings?limit=${limit}`);
        if (!res.ok) throw new Error('Failed to fetch featured listings');
        const data = await res.json();
        setListings(data.listings || []);
        setError(null);
      } catch (err: any) {
        setError(err.message);
        setListings([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFeatured();
  }, [limit]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm text-center">
        {error}
      </div>
    );
  }

  if (listings.length === 0) {
    return null;
  }

  return (
    <section aria-label="Featured properties" className="py-16 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Featured Stays</h2>
          <p className="text-lg text-gray-500">Handpicked properties for your next adventure</p>
        </div>

        <div role="list" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {listings.map((listing) => (
            <article
              key={listing.id}
              className="group bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden border border-gray-100"
            >
              {/* Image */}
              <div className="h-48 bg-gradient-to-br from-brand-100 to-brand-200 flex items-center justify-center relative">
                {listing.primaryImage ? (
                  <img
                    src={listing.primaryImage}
                    alt={`${listing.name} - ${listing.shortDescription}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-4xl" aria-hidden="true">
                    🏕️
                  </span>
                )}
                {listing.rating && (
                  <div
                    className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1 text-sm font-medium"
                    aria-label={`Rating: ${listing.rating} out of 5`}
                  >
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" aria-hidden="true" />
                    {listing.rating}
                  </div>
                )}
              </div>

              <div className="p-5">
                <Link href={`/${locale}/stay/${listing.slug}`}>
                  <h3 className="font-semibold text-gray-900 text-lg mb-2 group-hover:text-brand-600 transition-colors">
                    {listing.name}
                  </h3>
                </Link>

                {/* Description */}
                <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                  {listing.shortDescription}
                </p>

                {/* Amenities preview */}
                {listing.amenities && listing.amenities.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4" role="list" aria-label="Amenities">
                    {listing.amenities.slice(0, 3).map((amenity) => (
                      <span
                        key={amenity}
                        className="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5"
                        role="listitem"
                      >
                        {amenity}
                      </span>
                    ))}
                    {listing.amenities.length > 3 && (
                      <span
                        className="text-xs text-gray-400"
                        aria-label={`Plus ${listing.amenities.length - 3} more amenities`}
                      >
                        +{listing.amenities.length - 3}
                      </span>
                    )}
                  </div>
                )}

                {/* Price + CTA */}
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xs text-gray-400">From</p>
                    <p className="text-xl font-bold text-gray-900">
                      {formatPrice(listing.pricePerNight)}
                    </p>
                    <p className="text-xs text-gray-400">/ night</p>
                  </div>
                  <Link
                    href={`/${locale}/stay/${listing.slug}`}
                    className="flex items-center gap-1.5 bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors"
                    aria-label={`View details for ${listing.name}`}
                  >
                    View
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="text-center mt-10">
          <button
            onClick={() => router.push(`/${locale}/search`)}
            className="px-8 py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl transition-colors"
            aria-label="View all properties"
          >
            View All Properties
          </button>
        </div>
      </div>
    </section>
  );
}
