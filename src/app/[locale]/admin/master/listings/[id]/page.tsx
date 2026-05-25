'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ChevronLeft,
  Store,
  Users,
  Calendar,
  DollarSign,
  Puzzle,
  Settings,
  Shield,
  Activity,
  ArrowUpRight,
  User,
  Star,
} from 'lucide-react';

export default function ListingDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { id, locale } = params;
  const [shop, setShop] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [featuredOrder, setFeaturedOrder] = useState<number | null>(null);
  const [featureLoading, setFeatureLoading] = useState(false);
  const [featureError, setFeatureError] = useState<string | null>(null);

  useEffect(() => {
    const fetchShop = async () => {
      try {
        const response = await fetch(`/api/admin/shops/${id}?adminId=master-admin`);
        if (response.ok) {
          const data = await response.json();
          setShop(data.shop);
          setIsFeatured(!!data.shop.is_featured);
          setFeaturedOrder(data.shop.featured_order ?? null);
        }
      } catch (error) {
        console.error('Failed to fetch shop details:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchShop();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-8 w-64 bg-gray-100 rounded-xl"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-gray-100 rounded-3xl"></div>
          ))}
        </div>
        <div className="h-96 bg-gray-100 rounded-[2.5rem]"></div>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-black text-gray-900">Shop not found</h2>
        <button
          onClick={() => router.back()}
          className="mt-4 text-purple-600 font-bold hover:underline"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-center">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-400 hover:text-purple-600 transition-all font-bold text-sm"
        >
          <ChevronLeft className="h-4 w-4" /> Back to Listings
        </button>
        <div className="flex gap-3">
          <button className="px-6 py-2 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200">
            Edit Listing
          </button>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="h-20 w-20 rounded-3xl bg-purple-600 flex items-center justify-center text-white">
          <Store className="h-10 w-10" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">{shop.name}</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-purple-50 text-purple-600">
              {shop.plan || 'Standard'} Plan
            </span>
            <span
              className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${shop.is_active ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}
            >
              {shop.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatsCard
          title="Total Revenue"
          value={`$${((shop.total_revenue_cents || 0) / 100).toLocaleString()}`}
          icon={DollarSign}
          color="green"
        />
        <StatsCard
          title="Total Bookings"
          value={shop.reservations_count || 0}
          icon={Calendar}
          color="blue"
        />
        <StatsCard
          title="Staff Members"
          value={shop.staff_count || 0}
          icon={Users}
          color="purple"
        />
        <StatsCard
          title="Active Plugins"
          value={shop.plugins?.length || 0}
          icon={Puzzle}
          color="orange"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Owner Details */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/40">
            <h3 className="text-xl font-black text-gray-900 mb-6">Owner Information</h3>
            <div className="grid grid-cols-2 gap-8">
              <div>
                <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">
                  Full Name
                </div>
                <div className="font-bold text-gray-900 flex items-center gap-2">
                  <User className="h-4 w-4 text-purple-600" />{' '}
                  {shop.owner_full_name || 'Not provided'}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">
                  Email Address
                </div>
                <div className="font-bold text-gray-900">{shop.owner_email}</div>
              </div>
              <div>
                <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">
                  Phone Number
                </div>
                <div className="font-bold text-gray-900">{shop.owner_phone || 'Not provided'}</div>
              </div>
              <div>
                <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">
                  Created At
                </div>
                <div className="font-bold text-gray-900">
                  {new Date(shop.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>

          {/* Installed Plugins */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/40">
            <h3 className="text-xl font-black text-gray-900 mb-6">Installed Plugins</h3>
            <div className="space-y-4">
              {shop.plugins && shop.plugins.length > 0 ? (
                shop.plugins.map((plugin: any) => (
                  <div
                    key={plugin.plugin_name}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-purple-600">
                        <Puzzle className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 capitalize">
                          {plugin.plugin_name}
                        </div>
                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                          {plugin.is_enabled ? 'Enabled' : 'Disabled'}
                        </div>
                      </div>
                    </div>
                    <button className="p-2 rounded-xl hover:bg-white text-gray-400 hover:text-gray-900 transition-all">
                      <Settings className="h-4 w-4" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-400 italic">
                  No plugins installed for this listing.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          {/* Featured control */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/40">
            <div className="flex items-center gap-3 mb-6">
              <div className={`p-2 rounded-xl ${isFeatured ? 'bg-yellow-50' : 'bg-gray-100'}`}>
                <Star
                  className={`h-5 w-5 ${isFeatured ? 'text-yellow-500 fill-yellow-400' : 'text-gray-400'}`}
                />
              </div>
              <h3 className="text-lg font-black text-gray-900">Homepage Feature</h3>
            </div>

            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              Featured listings appear in the{' '}
              <span className="font-bold text-gray-700">"Featured Stays"</span> carousel on the
              sinaicamps.com homepage. Only the master operator can control this.
            </p>

            {featureError && (
              <div className="mb-4 text-xs font-bold text-red-600 bg-red-50 rounded-xl px-4 py-3">
                {featureError}
              </div>
            )}

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl mb-4">
              <span className="text-sm font-bold text-gray-700">Show on homepage</span>
              <button
                data-testid="featured-toggle"
                disabled={featureLoading}
                onClick={async () => {
                  setFeatureLoading(true);
                  setFeatureError(null);
                  try {
                    const action = isFeatured ? 'unfeature' : 'feature';
                    const body: any = { action };
                    if (!isFeatured && featuredOrder != null) body.featured_order = featuredOrder;
                    const res = await fetch(`/api/master/listings/${shop.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(body),
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || 'Request failed');
                    setIsFeatured(data.is_featured);
                    setFeaturedOrder(data.featured_order);
                  } catch (err: any) {
                    setFeatureError(err.message);
                  } finally {
                    setFeatureLoading(false);
                  }
                }}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                  isFeatured ? 'bg-yellow-400' : 'bg-gray-300'
                } ${featureLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
                    isFeatured ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {isFeatured && (
              <div className="flex items-center gap-3">
                <label className="text-sm font-bold text-gray-600 whitespace-nowrap">
                  Display order
                </label>
                <input
                  data-testid="featured-order-input"
                  type="number"
                  min={1}
                  value={featuredOrder ?? ''}
                  onChange={(e) =>
                    setFeaturedOrder(e.target.value ? parseInt(e.target.value) : null)
                  }
                  onBlur={async () => {
                    if (featuredOrder == null) return;
                    setFeatureLoading(true);
                    setFeatureError(null);
                    try {
                      const res = await fetch(`/api/master/listings/${shop.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'feature', featured_order: featuredOrder }),
                      });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data.error || 'Request failed');
                      setFeaturedOrder(data.featured_order);
                    } catch (err: any) {
                      setFeatureError(err.message);
                    } finally {
                      setFeatureLoading(false);
                    }
                  }}
                  className="w-20 px-3 py-2 text-sm font-bold rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-yellow-300 text-center"
                />
                <span className="text-xs text-gray-400">(1 = first in carousel)</span>
              </div>
            )}

            <div
              className={`mt-5 flex items-center gap-2 text-xs font-bold uppercase tracking-widest ${
                isFeatured ? 'text-yellow-600' : 'text-gray-400'
              }`}
            >
              <Star className={`h-3 w-3 ${isFeatured ? 'fill-yellow-400' : ''}`} />
              {isFeatured ? `Featured — position #${featuredOrder ?? '–'}` : 'Not featured'}
            </div>
          </div>

          <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl shadow-purple-900/20 text-white">
            <h3 className="text-lg font-black mb-6">Quick Actions</h3>
            <div className="space-y-3">
              <ActionButton icon={Shield} label="Manage Permissions" />
              <ActionButton icon={Activity} label="View Audit Logs" />
              <ActionButton icon={ArrowUpRight} label="Login as Owner" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatsCard({ title, value, icon: Icon, color }: any) {
  const colors: any = {
    green: 'text-green-600 bg-green-50',
    blue: 'text-blue-600 bg-blue-50',
    purple: 'text-purple-600 bg-purple-50',
    orange: 'text-orange-600 bg-orange-50',
  };

  return (
    <div className="bg-white p-6 rounded-3xl shadow-xl shadow-gray-200/40 border border-gray-50">
      <div className={`p-3 rounded-2xl ${colors[color]} w-fit mb-4`}>
        <Icon className="h-6 w-6" />
      </div>
      <div className="text-2xl font-black text-gray-900 tracking-tight">{value}</div>
      <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
        {title}
      </div>
    </div>
  );
}

function ActionButton({ icon: Icon, label }: any) {
  return (
    <button className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all text-sm font-bold group">
      <div className="p-2 rounded-lg bg-white/5 group-hover:bg-purple-600 transition-all">
        <Icon className="h-4 w-4" />
      </div>
      {label}
    </button>
  );
}
