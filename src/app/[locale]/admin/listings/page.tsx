'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Store,
  Search,
  Filter,
  Plus,
  ChevronRight,
  ExternalLink,
  MapPin,
  Star,
  X,
} from 'lucide-react';

export default function MasterListingsPage() {
  const params = useParams();
  const locale = params.locale as string;

  const [shops, setShops] = useState<any[]>([]);
  const [templates, setTemplates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProperty, setNewProperty] = useState({ name: '', slug: '', template: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = async () => {
    try {
      const res = await fetch('/api/master/listings');
      const data = await res.json();
      setShops(data.listings || []);
      setTemplates(data.templates || []);
    } catch (err) {
      console.error('Failed to fetch listings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/master/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProperty),
      });
      if (res.ok) {
        setIsModalOpen(false);
        setNewProperty({ name: '', slug: '', template: '' });
        fetchListings();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to create property');
      }
    } catch (err) {
      console.error('Failed to create property:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 ">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Property Listings</h1>
          <p className="text-gray-500">Manage all properties and their configurations.</p>
        </div>
        <button
          data-testid="add-listing-btn"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-purple-700 transition-all shadow-xl shadow-purple-100"
        >
          <Plus className="h-5 w-5" /> Add Property
        </button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-gray-900">New Property</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-all"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleAddProperty} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">
                  Property Name
                </label>
                <input
                  data-testid="listing-name-input"
                  type="text"
                  required
                  value={newProperty.name}
                  onChange={(e) =>
                    setNewProperty({
                      ...newProperty,
                      name: e.target.value,
                      slug: e.target.value.toLowerCase().replace(/\s+/g, '-'),
                    })
                  }
                  className="w-full px-4 py-3 rounded-2xl border border-gray-100 focus:border-purple-200 outline-none transition-all"
                  placeholder="e.g. Safari Camp"
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">
                  Property Slug
                </label>
                <input
                  data-testid="listing-slug-input"
                  type="text"
                  required
                  value={newProperty.slug}
                  onChange={(e) => setNewProperty({ ...newProperty, slug: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-100 focus:border-purple-200 outline-none transition-all"
                  placeholder="e.g. safari-camp"
                />
              </div>
              {templates.length > 0 && (
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">
                    Build Template
                  </label>
                  <select
                    value={newProperty.template}
                    onChange={(e) =>
                      setNewProperty({
                        ...newProperty,
                        template: e.target.value,
                        slug: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 rounded-2xl border border-gray-100 focus:border-purple-200 outline-none transition-all bg-white"
                  >
                    <option value="">Select Template</option>
                    {templates.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <button
                type="submit"
                data-testid="save-listing-btn"
                disabled={submitting}
                className="w-full py-4 bg-purple-600 text-white rounded-2xl font-bold hover:bg-purple-700 shadow-xl shadow-purple-100 transition-all disabled:opacity-50 mt-4"
              >
                {submitting ? 'Creating...' : 'Create Property'}
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/40 overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
          <div className="relative w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search properties..."
              className="w-full pl-12 pr-4 py-3 rounded-2xl border border-gray-100 focus:border-purple-200 transition-all outline-none text-sm bg-white"
            />
          </div>
          <button className="p-3 rounded-xl border border-gray-100 text-gray-400 hover:text-gray-900 transition-all bg-white">
            <Filter className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-400 font-bold animate-pulse">
            Loading properties...
          </div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
                  Property
                </th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
                  Location
                </th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
                  Status
                </th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {shops.map((shop) => (
                <tr
                  key={shop.id}
                  data-testid={`listing-row-${shop.id}`}
                  className="hover:bg-gray-50/50 transition-all group"
                >
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600">
                        <Store className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="font-bold text-gray-900">{shop.name}</div>
                        <div className="text-xs text-gray-400 font-medium">Slug: {shop.slug}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-1.5 text-sm text-gray-600 font-medium">
                      <MapPin className="h-3.5 w-3.5 text-gray-400" />
                      {shop.location || 'Global'}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span
                      className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${shop.isActive ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}
                    >
                      {shop.isActive ? 'active' : 'inactive'}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/${locale}/admin/listings/${shop.id}`}
                        className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-800 transition-all"
                        role="link"
                      >
                        Manage <ChevronRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {shops.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-8 py-12 text-center text-gray-400 italic">
                    No properties found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
