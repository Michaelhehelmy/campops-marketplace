'use client';

import React from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Calendar, Users, MapPin } from 'lucide-react';

interface HeroSectionProps {
  locale?: string;
}

export default function HeroSection({ locale = 'en' }: HeroSectionProps) {
  const router = useRouter();
  const [destination, setDestination] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState('2');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (destination) params.set('destination', destination);
    if (checkIn) params.set('checkIn', checkIn);
    if (checkOut) params.set('checkOut', checkOut);
    if (guests) params.set('adults', guests);
    router.push(`/${locale}/search?${params.toString()}`);
  };

  return (
    <section
      aria-label="Hero search section"
      className="relative bg-gradient-to-br from-brand-600 to-brand-800 text-white py-20 px-4"
    >
      <div className="max-w-7xl mx-auto text-center">
        <h1 className="text-5xl font-bold mb-4 tracking-tight">Adventure Awaits</h1>
        <p className="text-xl text-brand-100 mb-10">
          Discover unique camps, lodges, and retreats around the world
        </p>

        <form
          onSubmit={handleSearch}
          aria-label="Search form"
          className="bg-white rounded-2xl shadow-2xl p-6 max-w-4xl mx-auto"
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <label htmlFor="destination" className="sr-only">
                Destination
              </label>
              <MapPin
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5"
                aria-hidden="true"
              />
              <input
                id="destination"
                type="text"
                placeholder="Search destinations"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-xl border-0 focus:ring-2 focus:ring-brand-500 text-gray-900"
              />
            </div>

            <div className="relative">
              <label htmlFor="check-in" className="sr-only">
                Check-in date
              </label>
              <Calendar
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5"
                aria-hidden="true"
              />
              <input
                id="check-in"
                type="date"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-xl border-0 focus:ring-2 focus:ring-brand-500 text-gray-900"
              />
            </div>

            <div className="relative">
              <label htmlFor="check-out" className="sr-only">
                Check-out date
              </label>
              <Calendar
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5"
                aria-hidden="true"
              />
              <input
                id="check-out"
                type="date"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-xl border-0 focus:ring-2 focus:ring-brand-500 text-gray-900"
              />
            </div>

            <div className="relative">
              <label htmlFor="guests" className="sr-only">
                Number of guests
              </label>
              <Users
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5"
                aria-hidden="true"
              />
              <select
                id="guests"
                value={guests}
                onChange={(e) => setGuests(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-xl border-0 focus:ring-2 focus:ring-brand-500 text-gray-900 appearance-none"
              >
                <option value="1">1 Guest</option>
                <option value="2">2 Guests</option>
                <option value="3">3 Guests</option>
                <option value="4">4 Guests</option>
                <option value="5">5+ Guests</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="mt-4 w-full md:w-auto px-8 py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <Search className="w-5 h-5" aria-hidden="true" />
            Search
          </button>
        </form>
      </div>
    </section>
  );
}
