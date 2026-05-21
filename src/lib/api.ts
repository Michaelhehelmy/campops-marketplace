/**
 * Typed API client for the SinaiCamps marketplace.
 * All requests go through /api/public/* which is proxied to the Express
 * server via next.config.ts rewrites.
 */

import { logger } from './logger';

const BASE =
  typeof window === 'undefined' ? process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000' : '';

function getCsrfTokenFromCookie(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)x-csrf-token=([^;]*)/);
  return match ? match[1] : '';
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = path.startsWith('http') ? path : `${BASE}/api/public${path}`;
  logger.debug(`[apiFetch] Fetching ${url}`);
  const csrfToken = getCsrfTokenFromCookie();
  const isMutating = init?.method && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(init.method);
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(isMutating && csrfToken ? { 'x-csrf-token': csrfToken } : {}),
      ...(init?.headers ?? {}),
    },
  });

  logger.debug(`[apiFetch] Received response for ${url}: status=${res.status}`);
  const text = await res.text();
  logger.debug(`[apiFetch] Raw response for ${url}:`, text);
  try {
    const data = JSON.parse(text);
    logger.debug(`[apiFetch] Parsed JSON for ${url}:`, JSON.stringify(data));
    return data as T;
  } catch (e) {
    logger.error(`[apiFetch] JSON parse error for ${url}:`, e);
    throw new Error(`Invalid JSON response from ${url}`);
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RoomTypeResult {
  id: string;
  name: string;
  price: number;
  displayPrice: number;
  displayCurrency: string;
  capacity: number;
  remaining: number;
}

export interface PropertyResult {
  id: string;
  name: string;
  slug: string;
  type: string;
  city: string | null;
  country: string | null;
  location: { lat: number | null; lon: number | null };
  currency_code: string;
  minPricePerNight: number;
  displayMinPrice: number;
  displayCurrency: string;
  availableRoomTypes: RoomTypeResult[];
}

export interface SearchResponse {
  properties: PropertyResult[];
  totalCount: number;
  checkIn: string;
  checkOut: string;
  nights: number;
}

export interface BookingPayload {
  propertyId: string;
  roomTypeId: string;
  checkIn: string;
  checkOut: string;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
  adults: number;
  children?: number;
  paymentProvider?: string;
  currency?: string;
}

export interface BookingResponse {
  reservationId: string;
  status: string;
  totalAmount: number;
  displayAmount: number;
  displayCurrency: string;
  paymentUrl: string | null;
  transactionId: string | null;
}

// ─── API functions ────────────────────────────────────────────────────────────

export async function searchProperties(params: {
  checkIn: string;
  checkOut: string;
  adults: number;
  children?: number;
  destination?: string;
  priceMin?: number;
  priceMax?: number;
  currency?: string;
  page?: number;
}): Promise<SearchResponse> {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined) qs.set(k, String(v));
  });
  return apiFetch<SearchResponse>(`/search?${qs}`);
}

export async function getProperty(
  slug: string,
  checkIn?: string,
  checkOut?: string,
  currency?: string
) {
  const qs = new URLSearchParams();
  if (checkIn) qs.set('checkIn', checkIn);
  if (checkOut) qs.set('checkOut', checkOut);
  if (currency) qs.set('currency', currency);
  return apiFetch<{ property: any; room_types: any[]; availability: any[] }>(
    `/properties/${slug}?${qs}`
  );
}

export async function createBooking(payload: BookingPayload): Promise<BookingResponse> {
  const BASE =
    typeof window === 'undefined' ? process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000' : '';
  const csrfToken = getCsrfTokenFromCookie();
  const body = {
    listingId: payload.propertyId,
    roomId: payload.roomTypeId,
    checkIn: payload.checkIn,
    checkOut: payload.checkOut,
    guestName: payload.guestName,
    guestEmail: payload.guestEmail,
    guestPhone: payload.guestPhone,
    adults: payload.adults,
    children: payload.children ?? 0,
    paymentProvider: payload.paymentProvider ?? 'pay_later',
  };
  const res = await fetch(`${BASE}/api/p/booking/book`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text);
  const data = JSON.parse(text);
  return {
    reservationId: data.booking?.id ?? data.id,
    status: data.booking?.status ?? 'confirmed',
    totalAmount: data.booking?.total_price ?? 0,
    displayAmount: data.booking?.total_price ?? 0,
    displayCurrency: data.booking?.currency ?? 'USD',
    paymentUrl: null,
    transactionId: null,
  };
}

export async function getBooking(id: string) {
  return apiFetch<{ booking: any }>(`/bookings/${id}`);
}

export async function getCurrencies(): Promise<{ currencies: string[] }> {
  return apiFetch<{ currencies: string[] }>('/currencies');
}

export async function getTenantListing(
  tenantId: string,
  checkIn?: string,
  checkOut?: string,
  currency?: string
) {
  const qs = new URLSearchParams();
  qs.set('tenantId', tenantId);
  if (checkIn) qs.set('checkIn', checkIn);
  if (checkOut) qs.set('checkOut', checkOut);
  if (currency) qs.set('currency', currency);
  return apiFetch<{ property: any; room_types: any[]; availability: any[] }>(
    `/tenant-listing?${qs}`
  );
}
