'use client';

import React from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Star, ArrowRight, ShieldCheck } from 'lucide-react';
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
      <div className="flex justify-center py-24">
        <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto my-8 bg-red-50/50 border border-red-200/60 rounded-2xl p-6 text-red-800 text-sm text-center backdrop-blur-md">
        {error}
      </div>
    );
  }

  if (listings.length === 0) {
    return null;
  }

  return (
    <section aria-label="Featured properties" className="py-20 px-4 bg-white">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16 relative">
          <span className="text-xs font-bold uppercase tracking-widest text-amber-500 bg-amber-50 px-3.5 py-1.5 rounded-full inline-block mb-3.5">
            👑 Handpicked Stays
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
            Featured Destinations
          </h2>
          <p className="text-base sm:text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
            Curated and audited by our adventure experts to guarantee direct-booking pricing, luxury standards, and seamless service.
          </p>
        </div>

        {/* Listings Grid */}
        <div role="list" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {listings.map((listing) => (
            <article
              key={listing.id}
              className="group bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] transition-all duration-300 flex flex-col h-full transform hover:-translate-y-1.5"
            >
              {/* Image & Badges */}
              <div className="h-56 bg-slate-100 overflow-hidden relative shrink-0">
                {listing.primaryImage ? (
                  <img
                    src={listing.primaryImage}
                    alt={`${listing.name} - ${listing.shortDescription}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-tr from-amber-50 to-amber-100 flex items-center justify-center">
                    <span className="text-5xl" aria-hidden="true">🏕️</span>
                  </div>
                )}

                {/* Direct Booking Discount Badge */}
                <div className="absolute top-4 left-4 bg-amber-400 text-slate-950 text-xs font-extrabold px-3 py-1.5 rounded-full shadow-md flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>15% DIRECT</span>
                </div>

                {/* Rating Badge */}
                {listing.rating && (
                  <div
                    className="absolute top-4 right-4 bg-slate-900/90 backdrop-blur-md text-white rounded-full px-2.5 py-1.5 flex items-center gap-1 text-xs font-bold shadow-md"
                    aria-label={`Rating: ${listing.rating} out of 5`}
                  >
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
                    {listing.rating}
                  </div>
                )}
              </div>

              {/* Card Body */}
              <div className="p-6 flex flex-col flex-grow">
                {/* Title */}
                <Link href={`/${locale}/stay/${listing.slug}`} className="block group/link">
                  <h3 className="font-extrabold text-slate-900 text-lg mb-2 group-hover/link:text-amber-500 transition-colors line-clamp-1 leading-snug">
                    {listing.name}
                  </h3>
                </Link>

                {/* Description */}
                <p className="text-sm text-slate-500 mb-4 line-clamp-2 leading-relaxed flex-grow">
                  {listing.shortDescription}
                </p>

                {/* Amenities */}
                {listing.amenities && listing.amenities.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-6 shrink-0" role="list" aria-label="Amenities">
                    {listing.amenities.slice(0, 3).map((amenity) => (
                      <span
                        key={amenity}
                        className="text-[11px] font-semibold bg-slate-50 text-slate-600 rounded-full px-2.5 py-1 border border-slate-100"
                        role="listitem"
                      >
                        {amenity}
                      </span>
                    ))}
                    {listing.amenities.length > 3 && (
                      <span
                        className="text-[11px] font-semibold text-slate-400 self-center pl-1"
                        aria-label={`Plus ${listing.amenities.length - 3} more amenities`}
                      >
                        +{listing.amenities.length - 3}
                      </span>
                    )}
                  </div>
                )}

                {/* Price + CTA Button */}
                <div className="flex items-end justify-between border-t border-slate-100 pt-5 mt-auto shrink-0">
                  <div>
                    <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Guaranteed Rate</p>
                    <p className="text-2xl font-black text-slate-900 leading-none my-1">
                      {formatPrice(listing.pricePerNight)}
                    </p>
                    <p className="text-[10px] text-slate-500">/ night + fees</p>
                  </div>
                  
                  <Link
                    href={`/${locale}/stay/${listing.slug}`}
                    className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-amber-500 text-white hover:text-slate-950 text-xs font-bold px-4 py-2.5 rounded-xl transition-all duration-300 shadow-sm transform hover:-translate-y-0.5"
                    aria-label={`View details for ${listing.name}`}
                  >
                    View
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* View All CTA */}
        <div className="text-center mt-16">
          <button
            onClick={() => router.push(`/${locale}/search`)}
            className="px-10 py-4 bg-slate-900 hover:bg-amber-500 text-white hover:text-slate-950 font-extrabold rounded-2xl transition-all duration-300 shadow-lg shadow-slate-900/10 hover:shadow-amber-500/20 transform hover:-translate-y-0.5"
            aria-label="View all properties"
          >
            Explore All Properties
          </button>
        </div>
      </div>
    </section>
  );
}
