/**
 * Typed API client for the CampOps marketplace.
 * All requests go through /api/public/* which is proxied to the Express
 * server via next.config.ts rewrites.
 */

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${BASE}/api/public${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as any).error ?? `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
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

export async function getProperty(slug: string, checkIn?: string, checkOut?: string, currency?: string) {
  const qs = new URLSearchParams();
  if (checkIn) qs.set("checkIn", checkIn);
  if (checkOut) qs.set("checkOut", checkOut);
  if (currency) qs.set("currency", currency);
  return apiFetch<{ property: any; room_types: any[]; availability: any[] }>(
    `/properties/${slug}?${qs}`,
  );
}

export async function createBooking(payload: BookingPayload): Promise<BookingResponse> {
  return apiFetch<BookingResponse>("/book", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getBooking(id: string) {
  return apiFetch<{ booking: any }>(`/bookings/${id}`);
}

export async function getCurrencies(): Promise<{ currencies: string[] }> {
  return apiFetch<{ currencies: string[] }>("/currencies");
}
