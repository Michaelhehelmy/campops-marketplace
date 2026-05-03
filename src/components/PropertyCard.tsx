"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { MapPin, Users, ArrowRight } from "lucide-react";
import type { PropertyResult } from "@/lib/api";

interface PropertyCardProps {
  property: PropertyResult;
  nights: number;
}

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function PropertyCard({ property, nights }: PropertyCardProps) {
  const params = useParams();
  const locale = params.locale as string;

  const cheapestRoom = property.availableRoomTypes[0];
  const displayCurrency = cheapestRoom?.displayCurrency ?? property.currency_code;

  return (
    <div className="group bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden border border-gray-100">
      {/* Placeholder image */}
      <div className="h-48 bg-gradient-to-br from-brand-100 to-brand-200 flex items-center justify-center">
        <span className="text-4xl">🏕️</span>
      </div>

      <div className="p-5">
        {/* Location */}
        {(property.city || property.country) && (
          <div className="flex items-center gap-1 text-xs text-gray-400 mb-1">
            <MapPin className="w-3 h-3" />
            <span>{[property.city, property.country].filter(Boolean).join(", ")}</span>
          </div>
        )}

        {/* Name */}
        <h2 className="font-semibold text-gray-900 text-lg mb-1 group-hover:text-brand-600 transition-colors">
          {property.name}
        </h2>

        {/* Type badge */}
        <span className="inline-block text-xs bg-brand-50 text-brand-700 rounded-full px-2.5 py-0.5 mb-3 capitalize">
          {property.type}
        </span>

        {/* Room types summary */}
        <div className="space-y-1.5 mb-4">
          {property.availableRoomTypes.slice(0, 2).map((rt) => (
            <div key={rt.id} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1.5 text-gray-600">
                <Users className="w-3.5 h-3.5" />
                <span>{rt.name}</span>
              </div>
              <span className="text-gray-500 text-xs">
                {rt.remaining} left
              </span>
            </div>
          ))}
        </div>

        {/* Price + CTA */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs text-gray-400">{nights} nights from</p>
            <p className="text-xl font-bold text-gray-900">
              {formatPrice(property.displayMinPrice * nights, displayCurrency)}
            </p>
            <p className="text-xs text-gray-400">
              {formatPrice(property.displayMinPrice, displayCurrency)} / night
            </p>
          </div>
          <Link
            href={`/${locale}/stay/${property.slug}`}
            className="flex items-center gap-1.5 bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors"
          >
            View
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
