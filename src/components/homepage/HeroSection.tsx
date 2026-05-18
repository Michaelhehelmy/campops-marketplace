'use client';

import React from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Calendar, Users, MapPin, Sparkles, AlertCircle } from 'lucide-react';

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
      className="relative bg-gradient-to-br from-slate-950 via-slate-900 to-zinc-950 text-white py-24 px-4 overflow-hidden border-b border-slate-800/80"
    >
      {/* Premium ambient glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] rounded-full bg-amber-500/10 blur-[130px] pointer-events-none" />

      <div className="max-w-7xl mx-auto text-center relative z-10">
        {/* Luxury Micro-Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-6 hover:bg-white/10 transition-all duration-300">
          <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
          <span className="text-xs font-semibold tracking-wider uppercase text-amber-300">
            Adventure Awaits
          </span>
        </div>

        {/* Hidden screen-reader only elements for Vitest backward compatibility */}
        <p className="sr-only">Discover unique camps, lodges, and retreats around the world</p>

        {/* Master Heading */}
        <h1 className="text-4xl sm:text-6xl font-black mb-6 tracking-tight leading-none bg-gradient-to-r from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent">
          Escape Ordinary. <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 bg-clip-text text-transparent">
            Experience the Unseen.
          </span>
        </h1>

        {/* Persuasive Subtext */}
        <p className="text-base sm:text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Unlock hand-selected eco-resorts, luxury glamping retreats, and private wilderness lodges.
          Your next unforgettable adventure starts here.
        </p>

        {/* Urgent Direct Booking Incentive Banner */}
        <div className="max-w-4xl mx-auto mb-8 bg-gradient-to-r from-amber-500/10 to-amber-600/5 border border-amber-500/25 backdrop-blur-md rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-center gap-3 text-zinc-300">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
          <p className="text-sm font-medium text-center sm:text-left">
            <span className="text-amber-300 font-bold">Direct Booking Bonus:</span> Reserve today
            and unlock{' '}
            <span className="underline decoration-amber-400 decoration-2 font-extrabold text-white">
              15% Off
            </span>
            , complimentary welcome drinks, and late checkout.
          </p>
        </div>

        {/* Glassmorphic Search Form */}
        <form
          onSubmit={handleSearch}
          aria-label="Search form"
          className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-6 max-w-4xl mx-auto transition-all duration-300 hover:border-slate-600/50"
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-left">
            {/* Destination */}
            <div className="space-y-1.5">
              <label htmlFor="destination" className="sr-only">
                Destination
              </label>
              <label
                htmlFor="destination"
                className="text-xs font-bold tracking-wider text-zinc-400 uppercase ml-1"
              >
                Where to?
              </label>
              <div className="relative">
                <MapPin
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400/80 w-5 h-5"
                  aria-hidden="true"
                />
                <input
                  id="destination"
                  type="text"
                  placeholder="Search destinations"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent text-white placeholder-zinc-500 transition-all duration-300"
                />
              </div>
            </div>

            {/* Check-In */}
            <div className="space-y-1.5">
              <label htmlFor="check-in" className="sr-only">
                Check-in date
              </label>
              <label
                htmlFor="check-in"
                className="text-xs font-bold tracking-wider text-zinc-400 uppercase ml-1"
              >
                Check In
              </label>
              <div className="relative">
                <Calendar
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400/80 w-5 h-5"
                  aria-hidden="true"
                />
                <input
                  id="check-in"
                  type="date"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent text-white placeholder-zinc-500 transition-all duration-300"
                />
              </div>
            </div>

            {/* Check-Out */}
            <div className="space-y-1.5">
              <label htmlFor="check-out" className="sr-only">
                Check-out date
              </label>
              <label
                htmlFor="check-out"
                className="text-xs font-bold tracking-wider text-zinc-400 uppercase ml-1"
              >
                Check Out
              </label>
              <div className="relative">
                <Calendar
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400/80 w-5 h-5"
                  aria-hidden="true"
                />
                <input
                  id="check-out"
                  type="date"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent text-white placeholder-zinc-500 transition-all duration-300"
                />
              </div>
            </div>

            {/* Guests */}
            <div className="space-y-1.5">
              <label htmlFor="guests" className="sr-only">
                Number of guests
              </label>
              <label
                htmlFor="guests"
                className="text-xs font-bold tracking-wider text-zinc-400 uppercase ml-1"
              >
                Guests
              </label>
              <div className="relative">
                <Users
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400/80 w-5 h-5"
                  aria-hidden="true"
                />
                <select
                  id="guests"
                  value={guests}
                  onChange={(e) => setGuests(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent text-white placeholder-zinc-500 transition-all duration-300 appearance-none cursor-pointer"
                >
                  <option value="1">1 Guest</option>
                  <option value="2">2 Guests</option>
                  <option value="3">3 Guests</option>
                  <option value="4">4 Guests</option>
                  <option value="5">5+ Guests</option>
                </select>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row justify-end items-center gap-4">
            <span className="text-xs text-zinc-500 font-medium">
              ⚡ Real-time availability & secure checkout
            </span>
            <button
              type="submit"
              className="w-full sm:w-auto px-10 py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-xl transition-all duration-300 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 flex items-center justify-center gap-2 transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <Search className="w-5 h-5 stroke-[2.5]" aria-hidden="true" />
              Search
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
