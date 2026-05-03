"use client";

import { useState } from "react";
import { Search, Users, MapPin } from "lucide-react";

interface SearchFormProps {
  onSearch: (params: {
    checkIn: string;
    checkOut: string;
    adults: number;
    children: number;
    destination: string;
    currency: string;
  }) => void;
  loading?: boolean;
  initialValues?: {
    checkIn?: string;
    checkOut?: string;
    adults?: number;
    children?: number;
    destination?: string;
  };
}

const today = () => new Date().toISOString().split("T")[0];
const tomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
};

export default function SearchForm({
  onSearch,
  loading = false,
  initialValues,
}: SearchFormProps) {
  const [checkIn, setCheckIn] = useState(initialValues?.checkIn ?? today());
  const [checkOut, setCheckOut] = useState(initialValues?.checkOut ?? tomorrow());
  const [adults, setAdults] = useState(initialValues?.adults ?? 2);
  const [children, setChildren] = useState(initialValues?.children ?? 0);
  const [destination, setDestination] = useState(initialValues?.destination ?? "");
  const [currency, setCurrency] = useState("USD");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({ checkIn, checkOut, adults, children, destination, currency });
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* Destination */}
      <div className="lg:col-span-1 relative">
        <label className="block text-xs font-medium text-gray-500 mb-1">Destination</label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="Anywhere"
            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
          />
        </div>
      </div>

      {/* Check-in */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Check-in</label>
        <input
          type="date"
          value={checkIn}
          min={today()}
          onChange={(e) => setCheckIn(e.target.value)}
          required
          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
        />
      </div>

      {/* Check-out */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Check-out</label>
        <input
          type="date"
          value={checkOut}
          min={checkIn}
          onChange={(e) => setCheckOut(e.target.value)}
          required
          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
        />
      </div>

      {/* Guests */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Guests</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Users className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="number"
              value={adults}
              min={1}
              max={20}
              onChange={(e) => setAdults(parseInt(e.target.value))}
              className="w-full pl-8 pr-2 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
              placeholder="Adults"
            />
          </div>
          <input
            type="number"
            value={children}
            min={0}
            max={10}
            onChange={(e) => setChildren(parseInt(e.target.value))}
            className="w-16 px-2 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
            placeholder="Kids"
          />
        </div>
      </div>

      {/* Currency + Submit */}
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-500 mb-1">Currency</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none bg-white"
          >
            {["USD", "EUR", "GBP", "AED", "EGP", "SAR"].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          <Search className="w-4 h-4" />
          {loading ? "Searching…" : "Search"}
        </button>
      </div>
    </form>
  );
}
