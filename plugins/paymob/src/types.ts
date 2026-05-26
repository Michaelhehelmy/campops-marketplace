export interface PaymobConfig {
  apiKey: string;
  iframeId: string;
  hmacSecret: string;
  integrationId: string;
}

export interface PaymobAuthResponse {
  token: string;
  profile: { id: number };
}

export interface PaymobOrderResponse {
  id: number;
  created_at: string;
  merchant_order_id?: string;
}

export interface PaymobPaymentKeyResponse {
  token: string;
  id: number;
}

export interface PaymobTransaction {
  id: number;
  order: { id: number };
  success: boolean;
  pending: boolean;
  amount_cents: number;
  currency: string;
  created_at: string;
  source_data: { type: string; pan: string; sub_type: string };
  payment_method: string;
  is_void: boolean;
  is_refund: boolean;
  is_auth: boolean;
  is_capture: boolean;
  is_standalone_payment: boolean;
  is_3d_secure: boolean;
  error_occured: boolean;
  has_parent_transaction: boolean;
  integration_id: number;
  owner: number;
  data: Record<string, string>;
}

export interface CreatePaymentRequest {
  bookingId: string;
  amountCents: number;
  currency: string;
  billingData: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    street?: string;
    building?: string;
    floor?: string;
    apartment?: string;
    city?: string;
    country?: string;
    state?: string;
  };
}

export interface PaymobWebhookPayload {
  obj: PaymobTransaction;
  type: string;
}
