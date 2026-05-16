/**
 * SiteMinder Channel Manager Adapter Plugin
 * ─────────────────────────────────────────
 * Connects CampOps to the SiteMinder REST API for two-way sync.
 */

import type { PluginAPI } from '@campops/plugin-sdk';
import type {
  OTAAdapter,
  RoomMapping,
  RateMapping,
  ChannelReservation,
  InventorySyncResult,
  RateSyncResult,
} from '../../../packages/plugin-sdk/src/ota.js';
import { OTAAdapterRegistry } from '../../../packages/plugin-sdk/src/ota.js';

const DEFAULT_BASE_URL = 'https://api.siteminder.com/v1';

class SiteMinderAdapter implements OTAAdapter {
  readonly id = 'siteminder';
  readonly name = 'SiteMinder';

  private apiKey: string;
  private hotelId: string;
  private baseUrl: string;

  constructor(private api: PluginAPI) {
    const config = api.config as Record<string, string>;
    this.apiKey = config.SITEMINDER_API_KEY ?? '';
    this.hotelId = config.SITEMINDER_HOTEL_ID ?? '';
    this.baseUrl = config.SITEMINDER_BASE_URL ?? DEFAULT_BASE_URL;
  }

  private async request(method: string, path: string, body?: unknown): Promise<any> {
    if (!this.apiKey || !this.hotelId) {
      throw new Error('[SiteMinder] SITEMINDER_API_KEY and SITEMINDER_HOTEL_ID must be set');
    }
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': this.apiKey,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`[SiteMinder] HTTP ${res.status}: ${text}`);
    }
    return res.json().catch(() => ({}));
  }

  async syncInventory(roomMappings: RoomMapping[]): Promise<InventorySyncResult> {
    const errors: string[] = [];
    let updated = 0;

    for (const mapping of roomMappings) {
      try {
        await this.request(
          'PUT',
          `/hotels/${this.hotelId}/rooms/${mapping.channelRoomId}/availability`,
          {
            roomId: mapping.channelRoomId,
            available: true,
          }
        );
        updated++;
      } catch (err: any) {
        errors.push(`Room ${mapping.localRoomId}: ${err.message}`);
      }
    }

    return { updated, errors };
  }

  async syncRates(rateMappings: RateMapping[]): Promise<RateSyncResult> {
    const errors: string[] = [];
    let updated = 0;

    for (const mapping of rateMappings) {
      try {
        await this.request('PUT', `/hotels/${this.hotelId}/rates/${mapping.channelRatePlanId}`, {
          ratePlanId: mapping.channelRatePlanId,
          currency: mapping.currency,
        });
        updated++;
      } catch (err: any) {
        errors.push(`Rate ${mapping.localRatePlanId}: ${err.message}`);
      }
    }

    return { updated, errors };
  }

  async fetchReservations(since: Date): Promise<ChannelReservation[]> {
    const data = await this.request(
      'GET',
      `/hotels/${this.hotelId}/reservations?modifiedSince=${since.toISOString()}`
    );

    const reservations: ChannelReservation[] = [];
    const items: any[] = data.reservations ?? data.data ?? [];

    for (const item of items) {
      reservations.push({
        channelRef: item.reservationId ?? item.id,
        roomId: item.roomId ?? '',
        guestName: item.guestName ?? item.guest?.name ?? 'SiteMinder Guest',
        checkIn: new Date(item.checkIn ?? item.arrivalDate),
        checkOut: new Date(item.checkOut ?? item.departureDate),
        totalAmount: parseFloat(item.totalAmount ?? item.total ?? '0'),
        currency: item.currency ?? 'USD',
        source: 'siteminder',
      });
    }

    return reservations;
  }

  async cancelReservation(channelRef: string): Promise<void> {
    await this.request('DELETE', `/hotels/${this.hotelId}/reservations/${channelRef}`);
  }
}

export default async function init(api: PluginAPI): Promise<void> {
  const adapter = new SiteMinderAdapter(api);
  OTAAdapterRegistry.register(adapter);
  api.logger.info(`[siteminder] Registered OTAAdapter: ${adapter.name}`);
}
