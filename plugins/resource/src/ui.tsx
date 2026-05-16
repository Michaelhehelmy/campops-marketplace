'use client';

import React from 'react';

// ── Types ────────────────────────────────────────────────────────────────────

interface Listing {
  id: string;
  tenant_id: string;
  title: string;
  slug: string;
  description?: string;
  location?: string;
  tier?: string;
  images?: string; // JSON string of string[]
  is_active?: number | boolean;
  is_featured?: number | boolean;
  metadata?: string;
  created_at?: string;
  updated_at?: string;
}

function parseImages(images: string | undefined): string[] {
  if (!images) return [];
  try {
    return JSON.parse(images);
  } catch {
    return [];
  }
}

// ── FeaturedListings (slot: public.homepage) ─────────────────────────────────

export function FeaturedListings() {
  const [listings, setListings] = React.useState<Listing[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch('/api/p/resource/listings?limit=6')
      .then((r) => r.json())
      .then((data) => setListings(data.listings ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="resource-featured-skeleton" aria-label="Loading featured listings">
        {[1, 2, 3].map((i) => (
          <div key={i} className="resource-card-skeleton" />
        ))}
      </div>
    );
  }

  return (
    <section className="resource-featured" data-testid="featured-listings">
      <h2 className="resource-section-title">Featured Listings</h2>
      <div className="resource-grid" data-testid="featured-listings-grid">
        {listings.map((listing) => (
          <a
            key={listing.id}
            href={`/stay/${listing.slug}`}
            className="resource-card"
            data-testid={`listing-card-${listing.slug}`}
          >
            {parseImages(listing.images)[0] && (
              <img
                src={parseImages(listing.images)[0]}
                alt={listing.title}
                className="resource-card-image"
              />
            )}
            <div className="resource-card-body">
              <h3 className="resource-card-title" data-testid="listing-title">
                {listing.title}
              </h3>
              {listing.location && (
                <p className="resource-card-location" data-testid="listing-location">
                  📍 {listing.location}
                </p>
              )}
              <span
                className={`resource-tier-badge resource-tier-${listing.tier ?? 'basic'}`}
                data-testid="listing-tier"
              >
                {listing.tier ?? 'basic'}
              </span>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

// ── SearchBar (slot: public.search) ──────────────────────────────────────────

export function SearchBar() {
  const [query, setQuery] = React.useState('');
  const [location, setLocation] = React.useState('');
  const [results, setResults] = React.useState<Listing[]>([]);
  const [searching, setSearching] = React.useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearching(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set('search', query);
      if (location) params.set('location', location);
      const resp = await fetch(`/api/p/resource/listings?${params}`);
      const data = await resp.json();
      setResults(data.listings ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="resource-search" data-testid="resource-search">
      <form className="resource-search-form" onSubmit={handleSearch} data-testid="search-form">
        <input
          className="resource-search-input"
          type="text"
          placeholder="Search listings…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          data-testid="search-input"
        />
        <input
          className="resource-search-input"
          type="text"
          placeholder="Location…"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          data-testid="location-input"
        />
        <button
          className="resource-search-btn"
          type="submit"
          disabled={searching}
          data-testid="search-button"
        >
          {searching ? 'Searching…' : 'Search'}
        </button>
      </form>

      {results.length > 0 && (
        <div className="resource-search-results" data-testid="search-results">
          {results.map((listing) => (
            <a
              key={listing.id}
              href={`/stay/${listing.slug}`}
              className="resource-result-item"
              data-testid={`result-${listing.slug}`}
            >
              <strong>{listing.title}</strong>
              {listing.location && <span> — {listing.location}</span>}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ── ListingDetail (slot: public.listing-detail) ───────────────────────────────

interface ListingDetailProps {
  slug?: string;
}

export function ListingDetail({ slug }: ListingDetailProps) {
  const [listing, setListing] = React.useState<Listing | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!slug) return;
    fetch(`/api/p/resource/listings/${slug}`)
      .then((r) => {
        if (!r.ok) throw new Error('Listing not found');
        return r.json();
      })
      .then((data) => setListing(data.listing))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading)
    return (
      <div className="resource-loading" data-testid="listing-loading">
        Loading…
      </div>
    );
  if (error || !listing)
    return (
      <div className="resource-error" data-testid="listing-error">
        Listing not found.
      </div>
    );

  return (
    <article className="resource-listing-detail" data-testid="listing-detail">
      {parseImages(listing.images)[0] && (
        <img
          src={parseImages(listing.images)[0]}
          alt={listing.title}
          className="resource-detail-hero"
          data-testid="listing-hero-image"
        />
      )}
      <div className="resource-detail-content">
        <h1 className="resource-detail-title" data-testid="listing-detail-title">
          {listing.title}
        </h1>
        {listing.location && (
          <p className="resource-detail-location" data-testid="listing-detail-location">
            📍 {listing.location}
          </p>
        )}
        <span
          className={`resource-tier-badge resource-tier-${listing.tier ?? 'basic'}`}
          data-testid="listing-detail-tier"
        >
          {listing.tier ?? 'basic'}
        </span>
        {listing.description && (
          <p className="resource-detail-description" data-testid="listing-detail-description">
            {listing.description}
          </p>
        )}

        {/* Booking plugin slot placeholder */}
        <div
          className="resource-booking-slot"
          data-slot="public.booking"
          data-testid="booking-slot-placeholder"
        >
          {/* Booking plugin renders here when enabled */}
        </div>
      </div>
    </article>
  );
}

// ── MasterListingsTable (slot: master.listings) ───────────────────────────────

export function MasterListingsTable() {
  const [listings, setListings] = React.useState<Listing[]>([]);
  const [loading, setLoading] = React.useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const resp = await fetch('/api/p/resource/listings?limit=100');
      const data = await resp.json();
      setListings(data.listings ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    load();
  }, []);

  const handleToggleActive = async (id: string, current: boolean) => {
    await fetch(`/api/p/resource/master/listings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !current }),
    });
    load();
  };

  if (loading)
    return (
      <div className="resource-loading" data-testid="master-table-loading">
        Loading…
      </div>
    );

  return (
    <div className="resource-master-table" data-testid="master-listings-table">
      <h2>All Listings</h2>
      <table className="resource-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Slug</th>
            <th>Tenant</th>
            <th>Tier</th>
            <th>Active</th>
            <th>Featured</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {listings.map((listing) => (
            <tr key={listing.id} data-testid={`master-row-${listing.id}`}>
              <td>{listing.title}</td>
              <td>
                <code>{listing.slug}</code>
              </td>
              <td>{listing.tenant_id}</td>
              <td>{listing.tier}</td>
              <td>{listing.is_active ? '✅' : '❌'}</td>
              <td>{listing.is_featured ? '⭐' : '—'}</td>
              <td>
                <button
                  onClick={() => handleToggleActive(listing.id, Boolean(listing.is_active))}
                  data-testid={`toggle-active-${listing.id}`}
                >
                  {listing.is_active ? 'Deactivate' : 'Activate'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── AdminEditForm (slot: manage.property) ─────────────────────────────────────

interface AdminEditFormProps {
  listingId?: string;
  tenantId?: string;
}

export function AdminEditForm({ listingId, tenantId }: AdminEditFormProps) {
  const [form, setForm] = React.useState({
    title: '',
    description: '',
    location: '',
    tier: 'basic',
    is_active: true,
  });
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!listingId || !tenantId) return;
    setSaving(true);
    setMessage(null);
    try {
      const resp = await fetch(`/api/p/resource/manage/listings/${listingId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
        },
        body: JSON.stringify(form),
      });
      const data = await resp.json();
      if (resp.ok) {
        setMessage('Listing updated successfully.');
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (err) {
      setMessage('Failed to update listing.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="resource-admin-form" onSubmit={handleSubmit} data-testid="admin-edit-form">
      <h2>Edit Listing</h2>
      <label>
        Title
        <input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          data-testid="admin-title-input"
        />
      </label>
      <label>
        Description
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          data-testid="admin-description-input"
        />
      </label>
      <label>
        Location
        <input
          value={form.location}
          onChange={(e) => setForm({ ...form, location: e.target.value })}
          data-testid="admin-location-input"
        />
      </label>
      <label>
        Tier
        <select
          value={form.tier}
          onChange={(e) => setForm({ ...form, tier: e.target.value })}
          data-testid="admin-tier-select"
        >
          <option value="basic">Basic</option>
          <option value="premium">Premium</option>
          <option value="elite">Elite</option>
        </select>
      </label>
      <label>
        <input
          type="checkbox"
          checked={form.is_active}
          onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
          data-testid="admin-active-checkbox"
        />
        Active
      </label>
      <button type="submit" disabled={saving} data-testid="admin-save-button">
        {saving ? 'Saving…' : 'Save Changes'}
      </button>
      {message && (
        <p className="resource-save-message" data-testid="admin-save-message">
          {message}
        </p>
      )}
    </form>
  );
}

export default {
  FeaturedListings,
  SearchBar,
  ListingDetail,
  MasterListingsTable,
  AdminEditForm,
};
