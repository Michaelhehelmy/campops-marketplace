'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MapPin, Users, Calendar, Loader2 } from 'lucide-react';
import { searchProperties, type PropertyResult } from '@/lib/api';
import PropertyCard from '@/components/PropertyCard';
import SearchForm from '@/components/SearchForm';

interface SearchParams {
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  destination: string;
  currency: string;
}

export default function SearchPage() {
  const [results, setResults] = useState<PropertyResult[] | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [nights, setNights] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSearch = (params: SearchParams) => {
    setError(null);
    setResults(null);
    startTransition(() => {
      void (async () => {
        try {
          const data = await searchProperties({
            checkIn: params.checkIn,
            checkOut: params.checkOut,
            adults: params.adults,
            children: params.children || undefined,
            destination: params.destination || undefined,
            currency: params.currency,
          });
          setResults(data.properties);
          setTotalCount(data.totalCount);
          setNights(data.nights);
        } catch (err: any) {
          setError(err.message);
          setResults([]);
        }
      })();
    });
  };

  useEffect(() => {
    handleSearch({
      checkIn: new Date().toISOString().split('T')[0],
      checkOut: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      adults: 2,
      children: 0,
      destination: '',
      currency: 'USD',
    });
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero */}
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-gray-900 mb-3">Find your perfect stay</h1>
        <p className="text-lg text-gray-500">Search across all our properties</p>
      </div>

      {/* Search form */}
      <div className="bg-white rounded-2xl shadow-md p-6 mb-8">
        <SearchForm onSearch={handleSearch} loading={isPending} />
      </div>

      {/* Results */}
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Available Camps</h2>

      {isPending && (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {results !== null && !isPending && (
        <>
          <p className="text-sm text-gray-500 mb-4">
            {totalCount} propert{totalCount === 1 ? 'y' : 'ies'} found
          </p>
          {results.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Search className="w-12 h-12 mx-auto mb-4 opacity-40" />
              <p className="text-lg">No properties available for your dates.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {results.map((property) => (
                <PropertyCard key={property.id} property={property} nights={nights} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
